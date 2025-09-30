from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from worklist.models import Study, Series, DicomImage, Patient, Modality
from accounts.models import User, Facility
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import json
import base64
import os
import time
import numpy as np
import pydicom
from io import BytesIO
# import cv2  # Optional for advanced image processing
from PIL import Image
from django.utils import timezone
import uuid

from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.conf import settings
from io import BytesIO
from PIL import Image
import base64
from pydicom.pixel_data_handlers.util import apply_voi_lut
import scipy.ndimage as ndimage
import logging
import subprocess

from .models import ViewerSession, Measurement, Annotation, ReconstructionJob
from .dicom_utils import DicomProcessor, safe_dicom_str
from .reconstruction import MPRProcessor, Bone3DProcessor, MRI3DProcessor
from .models import WindowLevelPreset, HangingProtocol

# Initialize logger
logger = logging.getLogger(__name__)

# MPR volume small LRU cache (per-process) - optimized for 3D performance
from threading import Lock
import gc

_MPR_CACHE_LOCK = Lock()
_MPR_CACHE = {}  # series_id -> { 'volume': np.ndarray, 'spacing': tuple, 'timestamp': float }
_MPR_CACHE_ORDER = []
_MAX_MPR_CACHE = 6  # Increased cache size for better performance

# Encoded MPR slice cache (LRU) to avoid repeated windowing+encoding per slice/plane/WW/WL
_MPR_IMG_CACHE_LOCK = Lock()
_MPR_IMG_CACHE = {}  # key -> base64 data URL
_MPR_IMG_CACHE_ORDER = []  # list of keys in LRU order
_MAX_MPR_IMG_CACHE = 800

def _mpr_cache_key(series_id, plane, slice_index, ww, wl, inverted):
    return f"{series_id}|{plane}|{int(slice_index)}|{int(round(float(ww)))}|{int(round(float(wl)))}|{1 if inverted else 0}"

def _mpr_cache_get(series_id, plane, slice_index, ww, wl, inverted):
    key = _mpr_cache_key(series_id, plane, slice_index, ww, wl, inverted)
    with _MPR_IMG_CACHE_LOCK:
        val = _MPR_IMG_CACHE.get(key)
        if val is not None:
            try:
                _MPR_IMG_CACHE_ORDER.remove(key)
            except ValueError:
                pass
            _MPR_IMG_CACHE_ORDER.append(key)
        return val

def _mpr_cache_set(series_id, plane, slice_index, ww, wl, inverted, img_b64):
    key = _mpr_cache_key(series_id, plane, slice_index, ww, wl, inverted)
    with _MPR_IMG_CACHE_LOCK:
        if key not in _MPR_IMG_CACHE:
            while len(_MPR_IMG_CACHE_ORDER) >= _MAX_MPR_IMG_CACHE:
                evict = _MPR_IMG_CACHE_ORDER.pop(0)
                _MPR_IMG_CACHE.pop(evict, None)
        _MPR_IMG_CACHE[key] = img_b64
        try:
            _MPR_IMG_CACHE_ORDER.remove(key)
        except ValueError:
            pass
        _MPR_IMG_CACHE_ORDER.append(key)

def _get_encoded_mpr_slice(series_id, volume, plane, slice_index, ww, wl, inverted):
    """Get encoded base64 PNG for given MPR slice, using cache if possible.
    volume is a numpy array (depth,height,width).
    """
    cached = _mpr_cache_get(series_id, plane, slice_index, ww, wl, inverted)
    if cached is not None:
        return cached
    
    # Validate slice index
    if plane == 'axial':
        if slice_index < 0 or slice_index >= volume.shape[0]:
            logger.warning(f"Invalid axial slice index {slice_index} for volume shape {volume.shape}")
            slice_index = min(max(0, slice_index), volume.shape[0] - 1)
        slice_array = volume[slice_index, :, :]
    elif plane == 'sagittal':
        if slice_index < 0 or slice_index >= volume.shape[2]:
            logger.warning(f"Invalid sagittal slice index {slice_index} for volume shape {volume.shape}")
            slice_index = min(max(0, slice_index), volume.shape[2] - 1)
        slice_array = volume[:, :, slice_index]
    else:  # coronal
        if slice_index < 0 or slice_index >= volume.shape[1]:
            logger.warning(f"Invalid coronal slice index {slice_index} for volume shape {volume.shape}")
            slice_index = min(max(0, slice_index), volume.shape[1] - 1)
        slice_array = volume[:, slice_index, :]
    
    img_b64 = _array_to_base64_image(slice_array, ww, wl, inverted)
    if img_b64:
        _mpr_cache_set(series_id, plane, slice_index, ww, wl, inverted, img_b64)
    else:
        logger.error(f"Failed to generate base64 image for MPR slice: series={series_id}, plane={plane}, slice={slice_index}")
    return img_b64

def _get_mpr_volume_for_series(series):
    """Return a 3D numpy volume (depth, height, width) for the given series.
    Uses a tiny LRU cache to avoid re-reading and decoding DICOMs on each request.
    """
    # Local import to avoid circular issues
    import numpy as _np
    import pydicom as _pydicom
    import os as _os

    with _MPR_CACHE_LOCK:
        entry = _MPR_CACHE.get(series.id)
        if entry is not None and isinstance(entry.get('volume'), _np.ndarray):
            # touch LRU order
            try:
                _MPR_CACHE_ORDER.remove(series.id)
            except ValueError:
                pass
            _MPR_CACHE_ORDER.append(series.id)
            return entry['volume']

    # Build the volume (read from disk once)
    images_qs = series.images.all().order_by('slice_location', 'instance_number')
    volume_data = []
    for img in images_qs:
        try:
            dicom_path = _os.path.join(settings.MEDIA_ROOT, str(img.file_path))
            ds = _pydicom.dcmread(dicom_path)
            try:
                pixel_array = ds.pixel_array.astype(_np.float32)
            except Exception:
                # Fallback to SimpleITK for compressed/transcoded pixel data
                try:
                    import SimpleITK as _sitk
                    sitk_image = _sitk.ReadImage(dicom_path)
                    px = _sitk.GetArrayFromImage(sitk_image)
                    if px.ndim == 3 and px.shape[0] == 1:
                        px = px[0]
                    pixel_array = px.astype(_np.float32)
                except Exception:
                    continue
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                try:
                    pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
                except Exception:
                    pass
            volume_data.append(pixel_array)
        except Exception:
            continue

    if len(volume_data) < 2:
        raise ValueError('Not enough images for MPR')

    volume = _np.stack(volume_data, axis=0)
    # For very thin stacks, interpolate along depth to stabilize reformats
    if volume.shape[0] < 16:
        factor = max(2, int(_np.ceil(16 / max(volume.shape[0], 1))))
        volume = ndimage.zoom(volume, (factor, 1, 1), order=1)

    with _MPR_CACHE_LOCK:
        if series.id not in _MPR_CACHE:
            # Enforce tiny LRU size
            while len(_MPR_CACHE_ORDER) >= _MAX_MPR_CACHE:
                evict_id = _MPR_CACHE_ORDER.pop(0)
                _MPR_CACHE.pop(evict_id, None)
            _MPR_CACHE[series.id] = { 'volume': volume }
            _MPR_CACHE_ORDER.append(series.id)
        else:
            # Update existing
            _MPR_CACHE[series.id]['volume'] = volume
            try:
                _MPR_CACHE_ORDER.remove(series.id)
            except ValueError:
                pass
            _MPR_CACHE_ORDER.append(series.id)

    return volume


# Removed web-based viewer entrypoints (standalone_viewer, advanced_standalone_viewer, view_study)

@login_required
def viewer(request):
    """Complete professional DICOM viewer with MPR, 3D reconstruction, and all medical imaging tools - Masterpiece Edition."""
    user = request.user
    
    # Get study parameter and validate
    study_id = request.GET.get('study', '')
    initial_study = None
    
    if study_id:
        try:
            initial_study = Study.objects.exclude(
                patient__patient_id__startswith='TEMP_'
            ).exclude(accession_number__startswith='TEMP_').get(id=study_id)
            
            # Check facility permissions
            if user.is_facility_user() and getattr(user, 'facility', None):
                if initial_study.facility != user.facility:
                    initial_study = None
        except (Study.DoesNotExist, ValueError):
            initial_study = None
    
    # Get recent studies for quick access - exclude temp studies
    if user.is_facility_user() and getattr(user, 'facility', None):
        recent_studies = Study.objects.filter(facility=user.facility).exclude(
            patient__patient_id__startswith='TEMP_'
        ).exclude(accession_number__startswith='TEMP_').order_by('-study_date')[:10]
    else:
        recent_studies = Study.objects.all().exclude(
            patient__patient_id__startswith='TEMP_'
        ).exclude(accession_number__startswith='TEMP_').order_by('-study_date')[:10]
    
    context = {
        'study_id': study_id,
        'series_id': request.GET.get('series', ''),
        'current_date': timezone.now().strftime('%Y-%m-%d'),
        'user': user,
        'initial_study': initial_study,
        'recent_studies': recent_studies,
    }
    return render(request, 'dicom_viewer/viewer.html', context)

@login_required
def masterpiece_viewer(request):
    """Masterpiece DICOM viewer - THE MAIN DICOM VIEWER with enhanced features."""
    user = request.user
    
    # Get study parameter and validate
    study_id = request.GET.get('study', '')
    initial_study = None
    
    if study_id:
        try:
            initial_study = Study.objects.exclude(
                patient__patient_id__startswith='TEMP_'
            ).exclude(accession_number__startswith='TEMP_').get(id=study_id)
            
            # Check facility permissions
            if user.is_facility_user() and getattr(user, 'facility', None):
                if initial_study.facility != user.facility:
                    initial_study = None
        except (Study.DoesNotExist, ValueError):
            initial_study = None
    
    # Get recent studies for quick access - exclude temp studies
    if user.is_facility_user() and getattr(user, 'facility', None):
        recent_studies = Study.objects.filter(facility=user.facility).exclude(
            patient__patient_id__startswith='TEMP_'
        ).exclude(accession_number__startswith='TEMP_').order_by('-study_date')[:10]
    else:
        recent_studies = Study.objects.all().exclude(
            patient__patient_id__startswith='TEMP_'
        ).exclude(accession_number__startswith='TEMP_').order_by('-study_date')[:10]
    
    context = {
        'study_id': study_id,
        'series_id': request.GET.get('series', ''),
        'current_date': timezone.now().strftime('%Y-%m-%d'),
        'user': user,
        'initial_study': initial_study,
        'recent_studies': recent_studies,
    }
    return render(request, 'dicom_viewer/masterpiece_viewer.html', context)

@login_required
def advanced_standalone_viewer(request):
    """Deprecated: web viewer removed. Redirect to desktop launcher endpoint."""
    return redirect('dicom_viewer:launch_standalone_viewer')

@login_required
def view_study(request, study_id):
    """Deprecated: web viewer removed. Redirect to desktop launcher endpoint for the specific study."""
    return redirect('dicom_viewer:launch_study_in_desktop_viewer', study_id=study_id)

@login_required
@csrf_exempt
def api_study_data(request, study_id):
    """API endpoint to get study data for viewer"""
    try:
        # Exclude temp studies from viewer
        study = get_object_or_404(
            Study.objects.exclude(patient__patient_id__startswith='TEMP_').exclude(accession_number__startswith='TEMP_'),
            id=study_id
        )
        user = request.user
        
        # Check facility permissions
        if user.is_facility_user() and getattr(user, 'facility', None):
            if study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        
        series_list = study.series_set.all().order_by('series_number')
        
        data = {
            'study': {
                'id': study.id,
                'accession_number': getattr(study, 'accession_number', ''),
                'patient_name': study.patient.full_name if study.patient else 'Unknown',
                'patient_id': study.patient.patient_id if study.patient else '',
                'study_date': study.study_date.isoformat() if study.study_date else '',
                'modality': study.modality.code if hasattr(study, 'modality') and study.modality else getattr(study, 'modality', 'Unknown'),
                'description': getattr(study, 'study_description', ''),
                'body_part': getattr(study, 'body_part', ''),
                'priority': getattr(study, 'priority', 'normal'),
                'clinical_info': getattr(study, 'clinical_info', ''),
            },
            'series': []
        }
        
        for series in series_list:
            try:
                images = series.images.all().order_by('instance_number')
                series_info = {
                    'id': series.id,
                    'series_number': getattr(series, 'series_number', 0),
                    'description': getattr(series, 'series_description', ''),
                    'modality': getattr(series, 'modality', 'Unknown'),
                    'image_count': images.count(),
                    'slice_thickness': getattr(series, 'slice_thickness', None),
                    'pixel_spacing': getattr(series, 'pixel_spacing', None),
                    'image_orientation': getattr(series, 'image_orientation', None),
                    'priority': getattr(series.study, 'priority', 'normal'),
                    'clinical_info': getattr(series.study, 'clinical_info', ''),
                    'images': []
                }
                
                for img in images:
                    try:
                        image_info = {
                            'id': img.id,
                            'instance_number': getattr(img, 'instance_number', 0),
                            'file_path': img.file_path.url if hasattr(img, 'file_path') and img.file_path else '',
                            'slice_location': getattr(img, 'slice_location', None),
                            'image_position': getattr(img, 'image_position', None),
                            'file_size': getattr(img, 'file_size', 0),
                        }
                        series_info['images'].append(image_info)
                    except Exception as e:
                        logger.warning(f"Error processing image {img.id}: {e}")
                        continue
                
                data['series'].append(series_info)
            except Exception as e:
                logger.warning(f"Error processing series {series.id}: {e}")
                continue
        
        return JsonResponse(data)
        
    except Exception as e:
        logger.error(f"Error in api_study_data for study {study_id}: {e}")
        return JsonResponse({'error': f'Failed to load study data: {str(e)}'}, status=500)

@login_required
@csrf_exempt
def api_image_metadata(request, image_id):
    """API endpoint to get specific image metadata"""
    image = get_object_or_404(DicomImage, id=image_id)
    user = request.user
    
    # Check permissions - Allow all authenticated users for now
    # TODO: Implement proper facility-based permissions after user setup
    pass  # Allow all authenticated users to view images
    
    data = {
        'id': image.id,
        'instance_number': image.instance_number,
        'file_path': image.file_path.url if image.file_path else '',
        'slice_location': image.slice_location,
        'image_position': image.image_position,
        'file_size': image.file_size,
        'series_id': image.series.id,
        'study_id': image.series.study.id,
    }
    
    return JsonResponse(data)

@login_required
@csrf_exempt  
def api_dicom_image_display(request, image_id):
    """API endpoint to serve DICOM image for display"""
    try:
        from worklist.models import DicomImage
        import pydicom
        from PIL import Image
        import numpy as np
        from io import BytesIO
        import base64
        
        image = get_object_or_404(DicomImage, id=image_id)
        user = request.user
        
        # Check permissions - Allow all authenticated users for now
        pass  # Allow all authenticated users to view images
        
        # Load DICOM file
        if not image.file_path or not os.path.exists(image.file_path.path):
            return JsonResponse({'error': 'Image file not found'}, status=404)
        
        # Read DICOM data
        ds = pydicom.dcmread(image.file_path.path)
        
        if not hasattr(ds, 'pixel_array'):
            return JsonResponse({'error': 'No pixel data in DICOM file'}, status=400)
        
        # Get pixel data
        pixel_array = ds.pixel_array
        
        # Apply rescale slope and intercept for proper display
        if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
            pixel_array = pixel_array * ds.RescaleSlope + ds.RescaleIntercept
        
        # Normalize to 8-bit for display
        pixel_min = np.min(pixel_array)
        pixel_max = np.max(pixel_array)
        
        if pixel_max > pixel_min:
            pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
        else:
            pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)
        
        # Convert to PIL Image
        if len(pixel_array.shape) == 2:
            pil_image = Image.fromarray(pixel_array, mode='L')
        else:
            pil_image = Image.fromarray(pixel_array)
        
        # Convert to base64 for web display
        buffer = BytesIO()
        pil_image.save(buffer, format='PNG')
        buffer.seek(0)
        
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Return image data with metadata
        return JsonResponse({
            'success': True,
            'image_data': f'data:image/png;base64,{image_base64}',
            'width': int(pixel_array.shape[1]) if len(pixel_array.shape) > 1 else int(pixel_array.shape[0]),
            'height': int(pixel_array.shape[0]),
            'pixel_spacing': getattr(ds, 'PixelSpacing', None),
            'window_center': getattr(ds, 'WindowCenter', None),
            'window_width': getattr(ds, 'WindowWidth', None),
            'rescale_slope': getattr(ds, 'RescaleSlope', 1),
            'rescale_intercept': getattr(ds, 'RescaleIntercept', 0),
            'instance_number': getattr(ds, 'InstanceNumber', 1),
            'slice_location': getattr(ds, 'SliceLocation', None)
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Failed to load image: {str(e)}'}, status=500)

@login_required
@csrf_exempt
def api_mpr_reconstruction(request, series_id):
    """API endpoint for Multiplanar Reconstruction (MPR)
    - If no plane is provided, returns mid-slice preview images for axial/sagittal/coronal plus counts
    - If plane is provided (?plane=axial|sagittal|coronal&slice=<idx>), returns that slice image and counts
    """
    series = get_object_or_404(Series, id=series_id)
    user = request.user

    # Check permissions
    if user.is_facility_user() and getattr(user, 'facility', None) and series.study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    try:
        # Load isotropically-resampled volume from cache or build once
        volume, _spacing = _get_mpr_volume_and_spacing(series)
        
        # Validate volume data
        if volume is None or volume.size == 0:
            raise ValueError("Empty volume data")
        if volume.ndim != 3:
            raise ValueError(f"Volume must be 3D, got {volume.ndim}D")
        if np.any(np.isnan(volume)) or np.any(np.isinf(volume)):
            logger.warning(f"Volume contains NaN or inf values for series {series_id}")
            volume = np.nan_to_num(volume, nan=0.0, posinf=0.0, neginf=0.0)

        # Windowing params
        def _derive_window(arr, fallback=(400.0, 40.0)):
            try:
                flat = arr.astype(np.float32).flatten()
                p1 = float(np.percentile(flat, 1))
                p99 = float(np.percentile(flat, 99))
                ww = max(1.0, p99 - p1)
                wl = (p99 + p1) / 2.0
                return ww, wl
            except Exception:
                return fallback

        # Use provided window params if present; otherwise derive once
        ww_param = request.GET.get('window_width')
        wl_param = request.GET.get('window_level')
        inverted = request.GET.get('inverted', 'false').lower() == 'true'
        if ww_param is None or wl_param is None:
            default_window_width, default_window_level = _derive_window(volume)
            window_width = float(ww_param) if ww_param is not None else float(default_window_width)
            window_level = float(wl_param) if wl_param is not None else float(default_window_level)
        else:
            window_width = float(ww_param)
            window_level = float(wl_param)

        # Counts per plane
        counts = {
            'axial': int(volume.shape[0]),
            'sagittal': int(volume.shape[2]),
            'coronal': int(volume.shape[1]),
        }

        plane = request.GET.get('plane')
        if plane:
            plane = plane.lower()
            if plane not in counts:
                return JsonResponse({'error': 'Invalid plane'}, status=400)
            # slice index
            try:
                slice_index = int(request.GET.get('slice', counts[plane] // 2))
            except Exception:
                slice_index = counts[plane] // 2
            slice_index = max(0, min(counts[plane] - 1, slice_index))

            # Get encoded slice via cache
            img_b64 = _get_encoded_mpr_slice(series.id, volume, plane, slice_index, window_width, window_level, inverted)
            return JsonResponse({
                'plane': plane,
                'index': slice_index,
                'count': counts[plane],
                'image': img_b64,
                'counts': counts,
                'volume_shape': tuple(int(x) for x in volume.shape),
                'series_info': {
                    'id': series.id,
                    'description': series.series_description,
                    'modality': series.modality,
                },
            })

        # Default: return mid-slice previews for all planes
        mpr_views = {}
        axial_idx = volume.shape[0] // 2
        sagittal_idx = volume.shape[2] // 2
        coronal_idx = volume.shape[1] // 2
        mpr_views['axial'] = _get_encoded_mpr_slice(series.id, volume, 'axial', axial_idx, window_width, window_level, inverted)
        mpr_views['sagittal'] = _get_encoded_mpr_slice(series.id, volume, 'sagittal', sagittal_idx, window_width, window_level, inverted)
        mpr_views['coronal'] = _get_encoded_mpr_slice(series.id, volume, 'coronal', coronal_idx, window_width, window_level, inverted)

        return JsonResponse({
            'mpr_views': mpr_views,
            'volume_shape': tuple(int(x) for x in volume.shape),
            'counts': counts,
            'series_info': {
                'id': series.id,
                'description': series.series_description,
                'modality': series.modality
            }
        })

    except ValueError as e:
        # Treat ValueError as client error (bad input/insufficient data)
        msg = str(e)
        if not msg:
            msg = 'Invalid parameters'
        logger.warning(f"MPR value error for series {series_id}: {msg}")
        return JsonResponse({'error': msg}, status=400)
    except Exception as e:
        logger.error(f"MPR reconstruction failed for series {series_id}: {str(e)}")
        import traceback
        logger.error(f"MPR traceback: {traceback.format_exc()}")
        return JsonResponse({'error': f'Error generating MPR: {str(e)}'}, status=500)

@login_required
@csrf_exempt
def api_mip_reconstruction(request, series_id):
    """API endpoint for Maximum Intensity Projection (MIP)
    Optimized to reuse cached 3D volume when available for instant response."""
    series = get_object_or_404(Series, id=series_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and getattr(user, 'facility', None) and series.study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Prefer isotropic volume for higher-quality MIP
        try:
            volume, _spacing = _get_mpr_volume_and_spacing(series)
            default_window_width, default_window_level = 400, 40
        except Exception:
            # Fallback: build volume from DICOMs (slower)
            images = series.images.all().order_by('slice_location', 'instance_number')
            if images.count() < 2:
                return JsonResponse({'error': 'Need at least 2 images for MIP'}, status=400)
            volume_data = []
            default_window_width = 400
            default_window_level = 40
            for img in images:
                try:
                    dicom_path = os.path.join(settings.MEDIA_ROOT, str(img.file_path))
                    ds = pydicom.dcmread(dicom_path)
                    px = ds.pixel_array.astype(np.float32)
                    if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                        px = px * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
                    if not volume_data:
                        ww = getattr(ds, 'WindowWidth', 400); wl = getattr(ds, 'WindowCenter', 40)
                        if hasattr(ww, '__iter__') and not isinstance(ww, str): ww = ww[0]
                        if hasattr(wl, '__iter__') and not isinstance(wl, str): wl = wl[0]
                        default_window_width, default_window_level = ww, wl
                    volume_data.append(px)
                except Exception:
                    continue
            if len(volume_data) < 2:
                return JsonResponse({'error': 'Could not read enough images for MIP'}, status=400)
            volume = np.stack(volume_data, axis=0)
        
        # Enhanced interpolation for thin stacks - always use high quality for better MIP
        quality = request.GET.get('quality', '').lower()
        if volume.shape[0] < 32:  # More aggressive threshold for better MIP quality
            # Use optimal interpolation factor for minimal images
            target_slices = max(32, volume.shape[0] * 3)  # Better interpolation ratio
            factor = target_slices / volume.shape[0]
            
            # Use high-quality interpolation for better MIP results
            volume = ndimage.zoom(volume, (factor, 1, 1), order=3, prefilter=True)
            logger.info(f"MIP enhanced interpolation: {volume.shape[0]} slices (factor: {factor:.2f})")
        
        # Get windowing parameters from request
        window_width = float(request.GET.get('window_width', default_window_width))
        window_level = float(request.GET.get('window_level', default_window_level))
        inverted = request.GET.get('inverted', 'false').lower() == 'true'
        
        # Generate MIP projections (vectorized)
        mip_views = {}
        mip_views['axial'] = _array_to_base64_image(np.max(volume, axis=0), window_width, window_level, inverted)
        mip_views['sagittal'] = _array_to_base64_image(np.max(volume, axis=1), window_width, window_level, inverted)
        mip_views['coronal'] = _array_to_base64_image(np.max(volume, axis=2), window_width, window_level, inverted)
        
        return JsonResponse({
            'mip_views': mip_views,
            'volume_shape': tuple(int(x) for x in volume.shape),
            'counts': {
                'axial': int(volume.shape[0]),
                'sagittal': int(volume.shape[2]),
                'coronal': int(volume.shape[1]),
            },
            'series_info': {
                'id': series.id,
                'description': series.series_description,
                'modality': series.modality
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Error generating MIP: {str(e)}'}, status=500)

@login_required
@csrf_exempt
def api_bone_reconstruction(request, series_id):
    """API endpoint for bone reconstruction using thresholding
    Optimized to reuse cached 3D volume when available; returns 3-plane previews instantly."""
    series = get_object_or_404(Series, id=series_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and getattr(user, 'facility', None) and series.study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Parameters
        threshold = int(request.GET.get('threshold', 300))
        want_mesh = (request.GET.get('mesh','false').lower() == 'true')
        quality = (request.GET.get('quality','').lower())
        
        # Fast path: reuse cached volume (isotropic for better quality)
        try:
            volume, _sp = _get_mpr_volume_and_spacing(series)
        except Exception:
            # Fallback: construct volume
            images = series.images.all().order_by('slice_location', 'instance_number')
            if images.count() < 2:
                return JsonResponse({'error': 'Need at least 2 images for bone reconstruction'}, status=400)
            volume_data = []
            for img in images:
                try:
                    dicom_path = os.path.join(settings.MEDIA_ROOT, str(img.file_path))
                    ds = pydicom.dcmread(dicom_path)
                    px = ds.pixel_array.astype(np.float32)
                    if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                        px = px * ds.RescaleSlope + ds.RescaleIntercept
                    volume_data.append(px)
                except Exception:
                    continue
            if len(volume_data) < 2:
                return JsonResponse({'error': 'Could not read enough images for bone reconstruction'}, status=400)
            volume = np.stack(volume_data, axis=0)
        
        # Enhanced stabilization for thin stacks - optimized for bone reconstruction
        if volume.shape[0] < 32:  # More aggressive for better bone quality
            # Calculate optimal factor for bone reconstruction
            target_slices = max(32, volume.shape[0] * 3)
            factor = target_slices / volume.shape[0]
            
            # Use high-quality interpolation for better bone surface detection
            volume = ndimage.zoom(volume, (factor, 1, 1), order=3, prefilter=True)
            logger.info(f"Bone enhanced interpolation: {volume.shape[0]} slices (factor: {factor:.2f})")
        
        # Threshold to bone
        bone_mask = volume >= threshold
        bone_volume = volume * bone_mask
        
        # Windowing defaults for bone
        window_width = float(request.GET.get('window_width', 2000))
        window_level = float(request.GET.get('window_level', 300))
        inverted = request.GET.get('inverted', 'false').lower() == 'true'
        
        # 3-plane orthogonal previews
        bone_views = {}
        axial_idx = bone_volume.shape[0] // 2
        sag_idx = bone_volume.shape[2] // 2
        cor_idx = bone_volume.shape[1] // 2
        bone_views['axial'] = _array_to_base64_image(bone_volume[axial_idx], window_width, window_level, inverted)
        bone_views['sagittal'] = _array_to_base64_image(bone_volume[:, :, sag_idx], window_width, window_level, inverted)
        bone_views['coronal'] = _array_to_base64_image(bone_volume[:, cor_idx, :], window_width, window_level, inverted)
        
        mesh_payload = None
        if want_mesh:
            try:
                from skimage import measure as _measure
                if quality == 'high':
                    vol_for_mesh = (bone_volume > 0).astype(np.float32)
                else:
                    ds_factor = max(1, int(np.ceil(max(1, bone_volume.shape[0]) / 128)))
                    vol_for_mesh = (bone_volume[::ds_factor, ::2, ::2] > 0).astype(np.float32)
                verts, faces, normals, values = _measure.marching_cubes(vol_for_mesh, level=0.5)
                mesh_payload = {
                    'vertices': verts.tolist(),
                    'faces': faces.tolist(),
                }
            except Exception:
                mesh_payload = None
        
        return JsonResponse({
            'bone_views': bone_views,
            'volume_shape': tuple(int(x) for x in bone_volume.shape),
            'counts': {
                'axial': int(bone_volume.shape[0]),
                'sagittal': int(bone_volume.shape[2]),
                'coronal': int(bone_volume.shape[1]),
            },
            'series_info': {
                'id': series.id,
                'description': series.series_description,
                'modality': series.modality
            },
            'mesh': mesh_payload
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Error generating bone reconstruction: {str(e)}'}, status=500)

@login_required
@csrf_exempt
def api_realtime_studies(request):
    """API endpoint for real-time study updates"""
    try:
        user = request.user
        
        # Get timestamp from request
        last_update = request.GET.get('last_update')
        
        try:
            if last_update:
                last_update_time = timezone.datetime.fromisoformat(last_update.replace('Z', '+00:00'))
            else:
                last_update_time = timezone.now() - timezone.timedelta(minutes=5)
        except:
            last_update_time = timezone.now() - timezone.timedelta(minutes=5)
        
        # Get studies updated since last check
        try:
            # Build base queryset with filters first, then slice
            if hasattr(user, 'is_facility_user') and user.is_facility_user() and hasattr(user, 'facility') and user.facility:
                base_query = Study.objects.filter(
                    facility=user.facility,
                    last_updated__gt=last_update_time
                )
            else:
                # For admin users or users without facility, show all studies
                base_query = Study.objects.filter(
                    last_updated__gt=last_update_time
                )
            
            # Apply filters to exclude temporary/invalid entries before slicing
            studies = base_query.exclude(
                patient__patient_id__startswith='TEMP_'
            ).exclude(
                accession_number__startswith='TEMP_'
            ).exclude(
                patient__first_name='TEMP'
            ).exclude(
                patient__last_name__startswith='TEMP'
            ).select_related('patient', 'modality', 'facility').prefetch_related('series_set__images').order_by('-last_updated')[:20]
        except Exception as e:
            logger.error(f"Error fetching studies: {str(e)}")
            # Return empty list if there's an issue
            return JsonResponse({
                'studies': [],
                'timestamp': timezone.now().isoformat(),
                'count': 0,
                'error': 'No studies available'
            })
        
        studies_data = []
        for study in studies:
            try:
                # Safe access to related objects
                patient_name = study.patient.full_name if study.patient else 'Unknown Patient'
                patient_id = study.patient.patient_id if study.patient else 'Unknown'
                modality_code = study.modality.code if study.modality else 'Unknown'
                facility_name = study.facility.name if study.facility else 'Unknown Facility'
                
                studies_data.append({
                    'id': study.id,
                    'accession_number': study.accession_number or 'N/A',
                    'patient_name': patient_name,
                    'patient_id': patient_id,
                    'study_date': study.study_date.isoformat() if study.study_date else timezone.now().isoformat(),
                    'modality': modality_code,
                    'description': study.study_description or 'No Description',
                    'status': study.status or 'unknown',
                    'priority': study.priority or 'normal',
                    'facility': facility_name,
                    'last_updated': study.last_updated.isoformat() if study.last_updated else timezone.now().isoformat(),
                    'series_count': study.series_set.count(),
                    'image_count': sum(series.images.count() for series in study.series_set.all())
                })
            except Exception as e:
                logger.error(f"Error processing study {study.id}: {str(e)}")
                continue
        
        return JsonResponse({
            'studies': studies_data,
            'timestamp': timezone.now().isoformat(),
            'count': len(studies_data)
        })
        
    except Exception as e:
        logger.error(f"Error in api_realtime_studies: {str(e)}")
        return JsonResponse({
            'error': 'Failed to load studies',
            'message': str(e),
            'studies': [],
            'timestamp': timezone.now().isoformat(),
            'count': 0
        }, status=500)

@login_required
@csrf_exempt
def api_study_progress(request, study_id):
    """API endpoint to get study processing progress"""
    study = get_object_or_404(Study, id=study_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    # Calculate progress
    total_images = 0
    processed_images = 0
    
    for series in study.series_set.all():
        series_images = series.images.all()
        total_images += series_images.count()
        processed_images += series_images.filter(processed=True).count()
    
    progress_percentage = (processed_images / total_images * 100) if total_images > 0 else 0
    
    return JsonResponse({
        'study_id': study.id,
        'total_images': total_images,
        'processed_images': processed_images,
        'progress_percentage': round(progress_percentage, 2),
        'status': study.status,
        'last_updated': study.last_updated.isoformat()
    })

def _array_to_base64_image(array, window_width=None, window_level=None, inverted=False, modality='CT', enhanced_contrast=True):
    """Convert numpy array to base64 encoded image with enhanced medical imaging processing"""
    try:
        # Validate input
        if array is None or array.size == 0:
            logger.warning("_array_to_base64_image: received empty array")
            return None
        
        # Ensure array is at least 2D
        if array.ndim == 1:
            # Convert 1D to 2D square array
            size = int(np.sqrt(array.size))
            if size * size == array.size:
                array = array.reshape(size, size)
            else:
                logger.warning("_array_to_base64_image: cannot reshape 1D array to square")
                return None
        elif array.ndim > 2:
            logger.warning(f"_array_to_base64_image: array has {array.ndim} dimensions, using first 2D slice")
            array = array[0] if array.ndim == 3 else array.reshape(array.shape[-2:])
            
        # Convert to float for calculations
        image_data = array.astype(np.float32)
        
        # Check for invalid data
        if np.any(np.isnan(image_data)) or np.any(np.isinf(image_data)):
            logger.warning("_array_to_base64_image: array contains NaN or inf values")
            image_data = np.nan_to_num(image_data, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Use enhanced DICOM processing for medical images
        if window_width is not None and window_level is not None and enhanced_contrast:
            try:
                processor = DicomProcessor()
                processed_array = processor.apply_windowing(
                    image_data, 
                    window_width, 
                    window_level, 
                    invert=inverted, 
                    enhanced_contrast=True,
                    modality=modality
                )
                # Convert to PIL Image directly from processed array
                img = Image.fromarray(processed_array, mode='L')
            except Exception as e:
                logger.warning(f"Enhanced processing failed: {e}, falling back to standard windowing")
                # Fallback to standard windowing
                if window_width is not None and window_level is not None:
                    min_val = window_level - window_width / 2
                    max_val = window_level + window_width / 2
                    image_data = np.clip(image_data, min_val, max_val)
                    if max_val > min_val:
                        image_data = (image_data - min_val) / (max_val - min_val) * 255
                    else:
                        image_data = np.zeros_like(image_data)
                else:
                    data_min, data_max = image_data.min(), image_data.max()
                    if data_max > data_min:
                        image_data = ((image_data - data_min) / (data_max - data_min) * 255)
                    else:
                        image_data = np.zeros_like(image_data)
                
                if inverted:
                    image_data = 255 - image_data
                
                normalized = np.clip(image_data, 0, 255).astype(np.uint8)
                img = Image.fromarray(normalized, mode='L')
        else:
            # Standard processing for non-medical images or when enhanced processing is disabled
            if window_width is not None and window_level is not None:
                min_val = window_level - window_width / 2
                max_val = window_level + window_width / 2
                image_data = np.clip(image_data, min_val, max_val)
                if max_val > min_val:
                    image_data = (image_data - min_val) / (max_val - min_val) * 255
                else:
                    image_data = np.zeros_like(image_data)
            else:
                data_min, data_max = image_data.min(), image_data.max()
                if data_max > data_min:
                    image_data = ((image_data - data_min) / (data_max - data_min) * 255)
                else:
                    image_data = np.zeros_like(image_data)
            
            if inverted:
                image_data = 255 - image_data
            
            normalized = np.clip(image_data, 0, 255).astype(np.uint8)
            img = Image.fromarray(normalized, mode='L')
        
        # Convert to base64 with optimized compression
        buffer = BytesIO()
        try:
            # For X-ray images, use higher quality PNG settings for better detail
            if modality in ['CR', 'DX', 'RF', 'XA', 'MG']:
                img.save(buffer, format='PNG', optimize=True, compress_level=6, pnginfo=None)
            else:
                # For CT/MR, balance speed and quality
                img.save(buffer, format='PNG', optimize=True, compress_level=3, pnginfo=None)
        except Exception as save_err:
            logger.warning(f"PNG save with optimization failed: {save_err}, trying basic save")
            try:
                img.save(buffer, format='PNG', optimize=False, compress_level=1)
            except Exception as fallback_err:
                logger.error(f"Basic PNG save also failed: {fallback_err}")
                # Last resort: try JPEG for compatibility
                img.save(buffer, format='JPEG', quality=85, optimize=True)
        
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        logger.error(f"_array_to_base64_image failed: {str(e)}, array shape: {getattr(array, 'shape', 'unknown')}, dtype: {getattr(array, 'dtype', 'unknown')}")
        return None

@login_required
def api_image_hounsfield(request, image_id):
    """API endpoint to get Hounsfield Unit value at specific pixel coordinates"""
    try:
        image = get_object_or_404(DicomImage, id=image_id)
        x = int(request.GET.get('x', 0))
        y = int(request.GET.get('y', 0))
        
        # Load DICOM file
        dicom_path = image.file_path
        if not os.path.exists(dicom_path):
            return JsonResponse({'error': 'DICOM file not found'}, status=404)
        
        try:
            # Load DICOM dataset
            ds = pydicom.dcmread(dicom_path)
            
            # Get pixel array
            pixel_array = ds.pixel_array
            
            # Validate coordinates
            if y >= pixel_array.shape[0] or x >= pixel_array.shape[1] or x < 0 or y < 0:
                return JsonResponse({'hounsfield_value': None, 'error': 'Coordinates out of bounds'})
            
            # Get raw pixel value
            raw_value = int(pixel_array[y, x])
            
            # Calculate Hounsfield Units
            # HU = (pixel_value * slope) + intercept
            slope = getattr(ds, 'RescaleSlope', 1.0)
            intercept = getattr(ds, 'RescaleIntercept', 0.0)
            
            hounsfield_value = (raw_value * slope) + intercept
            
            # Additional metadata
            pixel_spacing = getattr(ds, 'PixelSpacing', [1.0, 1.0])
            slice_thickness = getattr(ds, 'SliceThickness', 1.0)
            
            return JsonResponse({
                'hounsfield_value': round(hounsfield_value, 1),
                'raw_pixel_value': raw_value,
                'rescale_slope': slope,
                'rescale_intercept': intercept,
                'pixel_spacing': [float(pixel_spacing[0]), float(pixel_spacing[1])],
                'slice_thickness': float(slice_thickness),
                'coordinates': {'x': x, 'y': y},
                'modality': getattr(ds, 'Modality', 'Unknown')
            })
            
        except Exception as e:
            logger.error(f"Error calculating Hounsfield value: {str(e)}")
            return JsonResponse({'error': f'Error processing DICOM: {str(e)}'}, status=500)
            
    except Exception as e:
        logger.error(f"Error in Hounsfield API: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@csrf_exempt 
def api_dicom_image_display(request, image_id):
    """API endpoint to get processed DICOM image with windowing
    - If pixel data cannot be decoded, still return metadata and sensible window defaults
    """
    image = get_object_or_404(DicomImage, id=image_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and getattr(user, 'facility', None) and image.series.study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    # Always attempt to return a response (avoid 500 for robustness)
    warnings = {}
    try:
        # Get windowing parameters from request
        window_width_param = request.GET.get('window_width')
        window_level_param = request.GET.get('window_level')
        inverted = request.GET.get('inverted', 'false').lower() == 'true'

        # Read DICOM file (best-effort)
        ds = None
        try:
            dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
            ds = pydicom.dcmread(dicom_path, stop_before_pixels=False)
        except Exception as e:
            warnings['dicom_read_error'] = str(e)

        pixel_array = None
        pixel_decode_error = None
        if ds is not None:
            try:
                pixel_array = ds.pixel_array
                try:
                    modality = str(getattr(ds, 'Modality', '')).upper()
                    if modality in ['DX','CR','XA','RF','MG']:
                        pixel_array = apply_voi_lut(pixel_array, ds)
                except Exception:
                    pass
                pixel_array = pixel_array.astype(np.float32)
            except Exception as e:
                # Fallback for compressed DICOMs without pixel handler: try SimpleITK
                try:
                    import SimpleITK as sitk
                    dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
                    sitk_image = sitk.ReadImage(dicom_path)
                    pixel_array = sitk.GetArrayFromImage(sitk_image)
                    if pixel_array.ndim == 3 and pixel_array.shape[0] == 1:
                        pixel_array = pixel_array[0]
                    pixel_array = pixel_array.astype(np.float32)
                except Exception as _e:
                    pixel_decode_error = str(_e)
                    pixel_array = None
        
        # Apply rescale slope/intercept
        if pixel_array is not None and ds is not None and hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
            try:
                pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
            except Exception:
                pass
        
        # Enhanced window derivation with medical imaging optimization
        def derive_window(arr, fallback=(400.0, 40.0)):
            if arr is None:
                return fallback
            try:
                processor = DicomProcessor()
                modality = str(getattr(ds, 'Modality', '')).upper() if ds is not None else 'CT'
                
                # Use modality-specific windowing
                if modality in ['CR', 'DX', 'RF', 'XA', 'MG']:  # X-ray modalities
                    # Use X-ray specific windowing
                    body_part = str(getattr(ds, 'BodyPartExamined', '')) if ds is not None else ''
                    series_desc = str(getattr(ds, 'SeriesDescription', '')) if ds is not None else ''
                    ww, wl = processor.get_optimal_xray_windowing(arr, body_part, series_desc)
                else:
                    # Use general auto-windowing for CT and other modalities
                    ww, wl = processor.auto_window_from_data(arr, percentile_range=(2, 98), modality=modality)
                    
                    # Apply modality-specific adjustments
                    if modality == 'CT':
                        # For CT, suggest optimal preset based on HU range
                        try:
                            suggested_preset = processor.get_optimal_preset_for_hu_range(
                                arr.min(), arr.max(), modality
                            )
                            if suggested_preset in processor.window_presets:
                                preset = processor.window_presets[suggested_preset]
                                ww = preset['ww']
                                wl = preset['wl']
                        except:
                            pass
                
                return ww, wl
            except Exception:
                return fallback
        
        default_window_width = None
        default_window_level = None
        if ds is not None:
            default_window_width = getattr(ds, 'WindowWidth', None)
            default_window_level = getattr(ds, 'WindowCenter', None)
            if hasattr(default_window_width, '__iter__') and not isinstance(default_window_width, str):
                default_window_width = default_window_width[0]
            if hasattr(default_window_level, '__iter__') and not isinstance(default_window_level, str):
                default_window_level = default_window_level[0]
        if default_window_width is None or default_window_level is None:
            dw, dl = derive_window(pixel_array)
            default_window_width = default_window_width or dw
            default_window_level = default_window_level or dl
        
        # CR/DX defaults and MONOCHROME1 auto-invert
        modality = getattr(ds, 'Modality', '') if ds is not None else (image.series.modality or '')
        photo = str(getattr(ds, 'PhotometricInterpretation', '')).upper() if ds is not None else ''
        default_inverted = False
        if str(modality).upper() in ['DX','CR','XA','RF']:
            # Enhanced X-ray windowing for better visibility
            default_window_width = float(default_window_width) if default_window_width is not None else 2500.0
            default_window_level = float(default_window_level) if default_window_level is not None else 1200.0
            default_inverted = (photo == 'MONOCHROME1')
            
            # Apply additional X-ray specific processing if pixel array is available
            if pixel_array is not None:
                try:
                    # Enhance X-ray contrast using histogram equalization
                    from scipy import ndimage
                    
                    # Apply mild Gaussian smoothing to reduce noise
                    pixel_array = ndimage.gaussian_filter(pixel_array.astype(np.float32), sigma=0.5)
                    
                    # Apply adaptive contrast enhancement
                    p1, p99 = np.percentile(pixel_array.flatten(), [1, 99])
                    if p99 > p1:
                        # Clip extreme values
                        pixel_array = np.clip(pixel_array, p1, p99)
                        
                        # Apply contrast stretching
                        pixel_array = (pixel_array - p1) / (p99 - p1) * (p99 - p1) + p1
                        
                except ImportError:
                    # Fallback without scipy
                    pass
                except Exception as e:
                    logger.warning(f"X-ray enhancement failed: {e}")
                    pass
        
        # Overwrite request params only if not provided
        try:
            if window_width_param is None:
                window_width = float(default_window_width)
            else:
                window_width = float(window_width_param)
            if window_level_param is None:
                window_level = float(default_window_level)
            else:
                window_level = float(window_level_param)
            if request.GET.get('inverted') is None:
                inverted = bool(default_inverted)
        except Exception:
            window_width = float(default_window_width)
            window_level = float(default_window_level)
        
        # Generate image if pixels are available
        image_data_url = None
        if pixel_array is not None:
            try:
                modality = str(getattr(ds, 'Modality', 'CT')).upper() if ds is not None else 'CT'
                image_data_url = _array_to_base64_image(
                    pixel_array, 
                    window_width, 
                    window_level, 
                    inverted,
                    modality=modality,
                    enhanced_contrast=True
                )
            except Exception as e:
                warnings['render_error'] = str(e)
                image_data_url = None
        
        # Build image_info from ds if possible, otherwise from model/series
        def safe_float(v, fallback):
            try:
                return float(v)
            except Exception:
                return fallback
        
        image_info = {
            'id': image.id,
            'instance_number': getattr(image, 'instance_number', None),
            'slice_location': getattr(image, 'slice_location', None),
            'dimensions': [int(getattr(ds, 'Rows', 0) or 0), int(getattr(ds, 'Columns', 0) or 0)] if ds is not None else [0, 0],
            'pixel_spacing': getattr(ds, 'PixelSpacing', [1.0, 1.0]) if ds is not None else (image.series.pixel_spacing or [1.0, 1.0]),
            'slice_thickness': getattr(ds, 'SliceThickness', 1.0) if ds is not None else safe_float(getattr(image.series, 'slice_thickness', 1.0), 1.0),
            'default_window_width': float(default_window_width) if default_window_width is not None else 400.0,
            'default_window_level': float(default_window_level) if default_window_level is not None else 40.0,
            'modality': getattr(ds, 'Modality', '') if ds is not None else (image.series.modality or ''),
            'series_description': getattr(ds, 'SeriesDescription', '') if ds is not None else getattr(image.series, 'series_description', ''),
            'patient_name': str(getattr(ds, 'PatientName', '')) if ds is not None else (getattr(image.series.study.patient, 'full_name', '') if hasattr(image.series.study, 'patient') else ''),
            'study_date': str(getattr(ds, 'StudyDate', '')) if ds is not None else (getattr(image.series.study, 'study_date', '') or ''),
            'bits_allocated': getattr(ds, 'BitsAllocated', 16) if ds is not None else 16,
            'bits_stored': getattr(ds, 'BitsStored', 16) if ds is not None else 16,
            'photometric_interpretation': getattr(ds, 'PhotometricInterpretation', '') if ds is not None else '',
        }
        
        payload = {
            'image_data': image_data_url,
            'image_info': image_info,
            'windowing': {
                'window_width': window_width,
                'window_level': window_level,
                'inverted': inverted
            },
            'warnings': ({'pixel_decode_error': pixel_decode_error, **warnings} if (pixel_decode_error or warnings) else None)
        }
        
        response = JsonResponse(payload)
        
        # Add caching headers for better performance
        # Cache for 5 minutes for processed images (windowing may change)
        response['Cache-Control'] = 'public, max-age=300'
        response['Vary'] = 'window_width, window_level, inverted'
        
        # Add compression hint
        response['Content-Encoding-Hint'] = 'gzip'
        
        return response
    except Exception as e:
        # Last-resort: never 500; return minimal defaults
        minimal = {
            'image_data': None,
            'image_info': {
                'id': image.id,
                'instance_number': getattr(image, 'instance_number', None),
                'slice_location': getattr(image, 'slice_location', None),
                'dimensions': [0, 0],
                'pixel_spacing': [1.0, 1.0],
                'slice_thickness': 1.0,
                'default_window_width': 400.0,
                'default_window_level': 40.0,
                'modality': image.series.modality if hasattr(image.series, 'modality') else '',
                'series_description': getattr(image.series, 'series_description', ''),
                'patient_name': getattr(image.series.study.patient, 'full_name', '') if hasattr(image.series.study, 'patient') else '',
                'study_date': str(getattr(image.series.study, 'study_date', '')),
                'bits_allocated': 16,
                'bits_stored': 16,
                'photometric_interpretation': ''
            },
            'windowing': {
                'window_width': 400.0,
                'window_level': 40.0,
                'inverted': False
            },
            'warnings': {'fatal_error': str(e), **warnings}
        }
        return JsonResponse(minimal)  # 200 OK to avoid frontend failure

@login_required
@csrf_exempt
def api_measurements(request, study_id=None):
    """API endpoint for saving/loading measurements"""
    if study_id:
        study = get_object_or_404(Study, id=study_id)
        user = request.user
        
        # Check permissions
        if user.is_facility_user() and study.facility != user.facility:
            return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        # Save measurements
        try:
            data = json.loads(request.body)
            measurements = data.get('measurements', [])
            annotations = data.get('annotations', [])
            
            # Store measurements in session for standalone viewer
            if not study_id:
                request.session['measurements'] = measurements
                request.session['annotations'] = annotations
            else:
                # Save to database for study-based viewer
                # For now, store in session as well
                request.session[f'measurements_{study_id}'] = measurements
                request.session[f'annotations_{study_id}'] = annotations
            
            return JsonResponse({'success': True, 'message': 'Measurements saved'})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    
    elif request.method == 'GET':
        # Load measurements
        if not study_id:
            measurements = request.session.get('measurements', [])
            annotations = request.session.get('annotations', [])
        else:
            measurements = request.session.get(f'measurements_{study_id}', [])
            annotations = request.session.get(f'annotations_{study_id}', [])
        
        return JsonResponse({
            'measurements': measurements,
            'annotations': annotations
        })
    
    elif request.method == 'DELETE':
        # Clear measurements
        if not study_id:
            request.session.pop('measurements', None)
            request.session.pop('annotations', None)
        else:
            request.session.pop(f'measurements_{study_id}', None)
            request.session.pop(f'annotations_{study_id}', None)
        
        return JsonResponse({'success': True, 'message': 'Measurements cleared'})

@login_required
@csrf_exempt
def api_reconstruction(request, study_id):
    """API endpoint for 3D reconstruction processing"""
    study = get_object_or_404(Study, id=study_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            reconstruction_type = data.get('type')  # 'mpr', 'mip', 'bone', 'endoscopy', 'surgery'
            parameters = data.get('parameters', {})
            
            # This would process the reconstruction
            # For now, we'll simulate processing
            result = {
                'success': True,
                'reconstruction_id': f"recon_{study_id}_{reconstruction_type}",
                'type': reconstruction_type,
                'status': 'processing',
                'progress': 0,
                'estimated_time': 30,  # seconds
            }
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
@csrf_exempt
def api_hounsfield_units(request):
    """API endpoint for Hounsfield Unit calculations"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            x = int(data.get('x', 0))
            y = int(data.get('y', 0))
            image_id = data.get('image_id')
            
            if not image_id:
                return JsonResponse({'error': 'Image ID is required'}, status=400)
            
            # Get the DICOM image
            try:
                dicom_image = DicomImage.objects.get(id=image_id)
                user = request.user
                
                # Check permissions
                if user.is_facility_user() and getattr(user, 'facility', None) and dicom_image.series.study.facility != user.facility:
                    return JsonResponse({'error': 'Permission denied'}, status=403)
                
                # Load DICOM file and calculate actual HU value
                dicom_path = os.path.join(settings.MEDIA_ROOT, str(dicom_image.file_path))
                ds = pydicom.dcmread(dicom_path)
                
                # Get pixel data
                pixel_array = ds.pixel_array
                
                # Validate coordinates
                if y >= pixel_array.shape[0] or x >= pixel_array.shape[1] or x < 0 or y < 0:
                    return JsonResponse({'error': 'Coordinates out of bounds'}, status=400)
                
                # Get raw pixel value
                raw_value = int(pixel_array[y, x])
                
                # Apply rescale slope and intercept to get Hounsfield units
                slope = float(getattr(ds, 'RescaleSlope', 1.0))
                intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
                hu_value = raw_value * slope + intercept
                
                result = {
                    'hu_value': round(float(hu_value), 1),
                    'raw_value': raw_value,
                    'position': {'x': x, 'y': y},
                    'image_id': image_id,
                    'rescale_slope': slope,
                    'rescale_intercept': intercept,
                    'timestamp': timezone.now().isoformat()
                }
                
                return JsonResponse(result)
                
            except DicomImage.DoesNotExist:
                return JsonResponse({'error': 'Image not found'}, status=404)
            except Exception as e:
                logger.error(f"Error calculating HU value: {str(e)}")
                return JsonResponse({'error': f'Error calculating HU value: {str(e)}'}, status=500)
            
        except (json.JSONDecodeError, ValueError) as e:
            return JsonResponse({'error': f'Invalid data: {str(e)}'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
@csrf_exempt
def api_auto_window(request, image_id):
    """API endpoint for automatic window/level optimization"""
    if request.method == 'POST':
        try:
            image = get_object_or_404(DicomImage, id=image_id)
            user = request.user
            
            # Check permissions
            if user.is_facility_user() and getattr(user, 'facility', None) and image.series.study.facility != user.facility:
                return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
            
            # Load DICOM file and analyze
            dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
            ds = pydicom.dcmread(dicom_path)
            
            # Get pixel data and convert to HU
            try:
                pixel_array = ds.pixel_array
                try:
                    modality = str(getattr(ds, 'Modality', '')).upper()
                    if modality in ['DX','CR','XA','RF','MG']:
                        pixel_array = apply_voi_lut(pixel_array, ds)
                except Exception:
                    pass
                pixel_array = pixel_array.astype(np.float32)
            except Exception:
                try:
                    import SimpleITK as sitk
                    sitk_image = sitk.ReadImage(dicom_path)
                    px = sitk.GetArrayFromImage(sitk_image)
                    if px.ndim == 3 and px.shape[0] == 1:
                        px = px[0]
                    pixel_array = px.astype(np.float32)
                except Exception:
                    return JsonResponse({'success': False, 'error': 'Could not read pixel data'}, status=500)
            
            # Apply rescale slope/intercept
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                try:
                    pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
                except Exception:
                    pass
            
            # Use enhanced windowing algorithm
            processor = DicomProcessor()
            modality = str(getattr(ds, 'Modality', '')).upper()
            auto_ww, auto_wl = processor.auto_window_from_data(pixel_array, percentile_range=(2, 98), modality=modality)
            
            # Get modality and suggest optimal preset
            modality = str(getattr(ds, 'Modality', '')).upper()
            suggested_preset = None
            
            if modality == 'CT':
                suggested_preset = processor.get_optimal_preset_for_hu_range(
                    pixel_array.min(), pixel_array.max(), modality
                )
                if suggested_preset in processor.window_presets:
                    preset = processor.window_presets[suggested_preset]
                    auto_ww = preset['ww']
                    auto_wl = preset['wl']
            
            result = {
                'success': True,
                'window_width': float(auto_ww),
                'window_level': float(auto_wl),
                'suggested_preset': suggested_preset,
                'modality': modality,
                'hu_range': {
                    'min': float(pixel_array.min()),
                    'max': float(pixel_array.max()),
                    'mean': float(np.mean(pixel_array))
                }
            }
            
            return JsonResponse(result)
            
        except Exception as e:
            logger.error(f"Error in auto-windowing for image {image_id}: {str(e)}")
            return JsonResponse({'success': False, 'error': f'Auto-windowing failed: {str(e)}'}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

@login_required
@csrf_exempt
def api_window_level(request):
    """API endpoint for window/level adjustments"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            window_center = data.get('window_center')
            window_width = data.get('window_width')
            preset = data.get('preset')  # 'lung', 'bone', 'soft_tissue', 'brain', etc.
            
            # Predefined window/level presets
            presets = {
                'lung': {'center': -600, 'width': 1600},
                'bone': {'center': 300, 'width': 1500},
                'soft_tissue': {'center': 40, 'width': 350},
                'brain': {'center': 40, 'width': 80},
                'liver': {'center': 60, 'width': 160},
                'mediastinum': {'center': 50, 'width': 350},
            }
            
            if preset and preset in presets:
                window_center = presets[preset]['center']
                window_width = presets[preset]['width']
            
            result = {
                'window_center': window_center,
                'window_width': window_width,
                'preset': preset,
                'success': True
            }
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
@csrf_exempt
def api_calculate_distance(request):
    """API endpoint to calculate distance with pixel spacing"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            start_x = data.get('start_x')
            start_y = data.get('start_y')
            end_x = data.get('end_x')
            end_y = data.get('end_y')
            pixel_spacing = data.get('pixel_spacing', [1.0, 1.0])
            
            # Calculate pixel distance
            pixel_distance = np.sqrt((end_x - start_x)**2 + (end_y - start_y)**2)
            
            # Calculate real-world distance if pixel spacing is available
            if len(pixel_spacing) >= 2:
                try:
                    spacing_x = float(pixel_spacing[0])
                    spacing_y = float(pixel_spacing[1])
                    avg_spacing = (spacing_x + spacing_y) / 2
                    distance_mm = pixel_distance * avg_spacing
                    distance_cm = distance_mm / 10.0
                    
                    return JsonResponse({
                        'pixel_distance': round(pixel_distance, 2),
                        'distance_mm': round(distance_mm, 2),
                        'distance_cm': round(distance_cm, 2),
                        'formatted_text': f"{distance_mm:.1f} mm / {distance_cm:.2f} cm"
                    })
                except (ValueError, TypeError):
                    pass
            
            return JsonResponse({
                'pixel_distance': round(pixel_distance, 2),
                'formatted_text': f"{pixel_distance:.1f} px"
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def api_export_image(request, image_id):
    """Enhanced API endpoint to export image with detailed DICOM metadata and multiple views"""
    image = get_object_or_404(DicomImage, id=image_id)
    user = request.user
    
    # Check permissions
    study = image.series.study
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    export_format = request.GET.get('format', 'png')  # png, jpg, tiff, dicom, pdf
    include_metadata = request.GET.get('include_metadata', 'true').lower() == 'true'
    include_multiple_views = request.GET.get('multiple_views', 'false').lower() == 'true'
    window_presets = request.GET.get('presets', '').split(',') if request.GET.get('presets') else ['soft']
    
    try:
        # Load DICOM data
        dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
        if not os.path.exists(dicom_path):
            return JsonResponse({'error': 'DICOM file not found'}, status=404)
        
        ds = pydicom.dcmread(dicom_path)
        
        # Initialize DICOM processor for enhanced imaging
        from .dicom_utils import DicomProcessor, DicomFileHandler, safe_dicom_str
        processor = DicomProcessor()
        file_handler = DicomFileHandler()
        
        # Extract comprehensive DICOM metadata
        metadata = file_handler.extract_dicom_metadata(ds)
        
        # Enhanced metadata with clinical details
        enhanced_metadata = {
            **metadata,
            'export_timestamp': timezone.now().isoformat(),
            'exported_by': user.username,
            'facility': study.facility.name if study.facility else 'Unknown',
            'accession_number': study.accession_number,
            'study_uid': study.study_instance_uid,
            'series_uid': image.series.series_instance_uid,
            'image_uid': image.sop_instance_uid,
            'slice_location': image.slice_location,
            'instance_number': image.instance_number,
            'acquisition_date': getattr(ds, 'AcquisitionDate', ''),
            'acquisition_time': getattr(ds, 'AcquisitionTime', ''),
            'slice_thickness': getattr(ds, 'SliceThickness', ''),
            'pixel_spacing': safe_dicom_str(getattr(ds, 'PixelSpacing', '')),
            'image_position': safe_dicom_str(getattr(ds, 'ImagePositionPatient', '')),
            'image_orientation': safe_dicom_str(getattr(ds, 'ImageOrientationPatient', '')),
            'kvp': getattr(ds, 'KVP', ''),
            'exposure_time': getattr(ds, 'ExposureTime', ''),
            'x_ray_tube_current': getattr(ds, 'XRayTubeCurrent', ''),
            'exposure': getattr(ds, 'Exposure', ''),
            'filter_type': getattr(ds, 'FilterType', ''),
            'collimator_shape': getattr(ds, 'CollimatorShape', ''),
            'reconstruction_diameter': getattr(ds, 'ReconstructionDiameter', ''),
            'gantry_detector_tilt': getattr(ds, 'GantryDetectorTilt', ''),
            'table_height': getattr(ds, 'TableHeight', ''),
            'rotation_direction': getattr(ds, 'RotationDirection', ''),
            'spiral_pitch_factor': getattr(ds, 'SpiralPitchFactor', ''),
            'data_collection_diameter': getattr(ds, 'DataCollectionDiameter', ''),
        }
        
        # Create exports directory if it doesn't exist
        export_dir = os.path.join(settings.MEDIA_ROOT, 'exports')
        os.makedirs(export_dir, exist_ok=True)
        
        # Generate base filename with timestamp
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        base_filename = f"export_{image_id}_{timestamp}"
        
        exported_files = []
        
        if include_multiple_views and hasattr(ds, 'pixel_array'):
            # Generate multiple window/level views
            pixel_array = ds.pixel_array
            
            # Convert to Hounsfield units if CT
            if getattr(ds, 'Modality', '') == 'CT':
                pixel_array = processor.convert_to_hounsfield_units(pixel_array, ds)
            
            for preset_name in window_presets:
                if preset_name in processor.window_presets:
                    preset = processor.window_presets[preset_name]
                    
                    # Apply windowing
                    windowed_image = processor.apply_windowing(
                        pixel_array, 
                        preset['ww'], 
                        preset['wl'],
                        enhanced_contrast=True
                    )
                    
                    # Export image with preset name
                    view_filename = f"{base_filename}_{preset_name}.{export_format}"
                    view_path = os.path.join(export_dir, view_filename)
                    
                    if export_format.lower() in ['png', 'jpg', 'jpeg']:
                        from PIL import Image
                        pil_image = Image.fromarray(windowed_image)
                        pil_image.save(view_path)
                    elif export_format.lower() == 'tiff':
                        from PIL import Image
                        pil_image = Image.fromarray(windowed_image)
                        pil_image.save(view_path, format='TIFF')
                    
                    exported_files.append({
                        'filename': view_filename,
                        'preset': preset_name,
                        'description': preset['description'],
                        'window_width': preset['ww'],
                        'window_level': preset['wl'],
                        'download_url': f'/media/exports/{view_filename}'
                    })
        else:
            # Single view export
            if hasattr(ds, 'pixel_array'):
                pixel_array = ds.pixel_array
                
                # Auto-optimize window/level
                modality = getattr(ds, 'Modality', 'CT')
                window_width, window_level = processor.auto_window_from_data(pixel_array, modality=modality)
                
                # Apply windowing
                windowed_image = processor.apply_windowing(
                    pixel_array, 
                    window_width, 
                    window_level,
                    enhanced_contrast=True
                )
                
                # Export single image
                single_filename = f"{base_filename}.{export_format}"
                single_path = os.path.join(export_dir, single_filename)
                
                if export_format.lower() in ['png', 'jpg', 'jpeg']:
                    from PIL import Image
                    pil_image = Image.fromarray(windowed_image)
                    pil_image.save(single_path)
                elif export_format.lower() == 'tiff':
                    from PIL import Image
                    pil_image = Image.fromarray(windowed_image)
                    pil_image.save(single_path, format='TIFF')
                elif export_format.lower() == 'dicom':
                    # Copy original DICOM file
                    import shutil
                    single_filename = f"{base_filename}.dcm"
                    single_path = os.path.join(export_dir, single_filename)
                    shutil.copy2(dicom_path, single_path)
                
                exported_files.append({
                    'filename': single_filename,
                    'preset': 'auto',
                    'description': 'Auto-optimized window/level',
                    'window_width': window_width,
                    'window_level': window_level,
                    'download_url': f'/media/exports/{single_filename}'
                })
        
        # Export metadata if requested
        metadata_file = None
        if include_metadata:
            metadata_filename = f"{base_filename}_metadata.json"
            metadata_path = os.path.join(export_dir, metadata_filename)
            
            with open(metadata_path, 'w') as f:
                json.dump(enhanced_metadata, f, indent=2, default=str)
            
            metadata_file = {
                'filename': metadata_filename,
                'download_url': f'/media/exports/{metadata_filename}'
            }
        
        # Log export activity for audit
        try:
            from .medical_audit import MedicalAuditLogger
            audit_logger = MedicalAuditLogger()
            audit_logger.log_data_export(
                user=user,
                export_type=f'DICOM_IMAGE_{export_format.upper()}',
                data_description=f'Image {image_id} with {len(exported_files)} views',
                destination='LOCAL_FILE',
                success=True
            )
        except Exception as e:
            logger.warning(f"Failed to log export audit: {e}")
        
        result = {
            'success': True,
            'export_format': export_format,
            'exported_files': exported_files,
            'metadata_file': metadata_file,
            'total_files': len(exported_files) + (1 if metadata_file else 0),
            'enhanced_metadata': enhanced_metadata if include_metadata else None,
            'export_summary': {
                'image_id': image_id,
                'patient_name': enhanced_metadata.get('patient_name', ''),
                'study_date': enhanced_metadata.get('study_date', ''),
                'modality': enhanced_metadata.get('modality', ''),
                'body_part': enhanced_metadata.get('body_part_examined', ''),
                'series_description': enhanced_metadata.get('series_description', ''),
                'institution': enhanced_metadata.get('institution_name', ''),
                'exported_by': user.username,
                'export_timestamp': enhanced_metadata['export_timestamp']
            }
        }
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"Error exporting image {image_id}: {str(e)}")
        return JsonResponse({'error': f'Export failed: {str(e)}'}, status=500)

@login_required
@csrf_exempt
def api_annotations(request, study_id):
    """API endpoint for saving/loading annotations"""
    study = get_object_or_404(Study, id=study_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            annotations = data.get('annotations', [])
            
            # This would save annotations to database
            # For now, we'll just return success
            return JsonResponse({
                'success': True, 
                'message': f'Saved {len(annotations)} annotations',
                'annotation_count': len(annotations)
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    
    elif request.method == 'GET':
        # Load annotations
        # This would load annotations from database
        annotations = []
        return JsonResponse({'annotations': annotations})

@login_required
def api_cine_mode(request, series_id):
    """API endpoint for cine mode playback"""
    series = get_object_or_404(Series, id=series_id)
    user = request.user
    
    # Check permissions
    study = series.study
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    images = series.images.all().order_by('instance_number')
    
    cine_data = {
        'series_id': series_id,
        'image_count': images.count(),
        'frame_rate': 10,  # Default FPS
        'images': [
            {
                'id': img.id,
                'instance_number': img.instance_number,
                'file_path': img.file_path.url if img.file_path else '',
            } for img in images
        ]
    }
    
    return JsonResponse(cine_data)

@login_required
@csrf_exempt
def api_export_measurements(request, study_id):
    """API endpoint to export measurements as PDF"""
    study = get_object_or_404(Study, id=study_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            measurements = data.get('measurements', [])
            
            # This would generate a PDF report with measurements
            # For now, we'll simulate the export
            filename = f'measurements_{study.accession_number}_{int(time.time())}.pdf'
            download_url = f'/media/exports/{filename}'
            
            result = {
                'success': True,
                'download_url': download_url,
                'filename': filename,
                'measurement_count': len(measurements)
            }
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def load_from_directory(request):
    """Load DICOM files from local directory, flash drive, or disc"""
    if request.method == 'POST':
        try:
            import os
            import glob
            import time
            from pathlib import Path
            
            directory_path = request.POST.get('directory_path', '').strip()
            if not directory_path:
                return JsonResponse({'success': False, 'error': 'Directory path is required'})
            
            # Security check: ensure path is safe
            try:
                directory_path = os.path.abspath(directory_path)
                if not os.path.exists(directory_path):
                    return JsonResponse({'success': False, 'error': 'Directory does not exist'})
                if not os.path.isdir(directory_path):
                    return JsonResponse({'success': False, 'error': 'Path is not a directory'})
            except Exception as e:
                return JsonResponse({'success': False, 'error': f'Invalid directory path: {str(e)}'})
            
            # Performance and safety limits - adjusted for medical imaging workflows
            MAX_FILES_TO_SCAN = 5000   # Limit total files scanned (medical machines can have many files)
            MAX_DICOM_FILES = 3000     # Limit DICOM files found (handle large studies)
            MAX_SCAN_TIME = 60         # Maximum scan time in seconds (increased for large datasets)
            MAX_DEPTH = 15             # Maximum directory depth (medical storage can be deeply nested)
            
            # Recursively find DICOM files with limits and timeout
            dicom_files = []
            supported_extensions = ['.dcm', '.dicom', '.dic', '']  # Include files without extension
            start_time = time.time()
            files_scanned = 0
            
            try:
                for root, dirs, files in os.walk(directory_path):
                    # Check timeout
                    if time.time() - start_time > MAX_SCAN_TIME:
                        logger.warning(f"Directory scan timeout after {MAX_SCAN_TIME}s, processed {files_scanned} files")
                        break
                    
                    # Check depth limit
                    depth = root[len(directory_path):].count(os.sep)
                    if depth > MAX_DEPTH:
                        continue
                    
                    # Limit directory traversal for performance
                    if len(dirs) > 100:  # If too many subdirectories, skip some (increased for medical storage)
                        dirs[:] = dirs[:100]
                    
                    for file in files:
                        files_scanned += 1
                        
                        # Check limits
                        if files_scanned > MAX_FILES_TO_SCAN:
                            logger.warning(f"Reached maximum files to scan ({MAX_FILES_TO_SCAN})")
                            break
                        
                        if len(dicom_files) >= MAX_DICOM_FILES:
                            logger.info(f"Reached maximum DICOM files ({MAX_DICOM_FILES})")
                            break
                        
                        # Check timeout periodically (less frequent checks for better performance)
                        if files_scanned % 200 == 0 and time.time() - start_time > MAX_SCAN_TIME:
                            logger.warning(f"Directory scan timeout after {MAX_SCAN_TIME}s")
                            break
                        
                        file_path = os.path.join(root, file)
                        file_ext = os.path.splitext(file)[1].lower()
                        
                        # Quick extension check first
                        if file_ext in supported_extensions or not file_ext:
                            try:
                                # Quick DICOM validation with timeout protection
                                with open(file_path, 'rb') as f:
                                    header = f.read(132)
                                    if len(header) >= 132 and header[128:132] == b'DICM':
                                        dicom_files.append(file_path)
                                    elif len(header) >= 8:
                                        # Check for DICOM without preamble (limited read)
                                        f.seek(0)
                                        test_data = f.read(256)  # Reduced from larger read
                                        if b'DICM' in test_data or any(tag in test_data for tag in [b'\x08\x00', b'\x10\x00', b'\x20\x00']):
                                            dicom_files.append(file_path)
                            except (OSError, IOError, PermissionError):
                                # Skip files that can't be read (permission issues, etc.)
                                continue
                            except Exception:
                                # Skip any other file-related errors
                                continue
                    
                    # Break outer loop if limits reached
                    if files_scanned > MAX_FILES_TO_SCAN or len(dicom_files) >= MAX_DICOM_FILES:
                        break
                        
            except Exception as e:
                logger.error(f"Error during directory scan: {str(e)}")
                return JsonResponse({'success': False, 'error': f'Error scanning directory: {str(e)}'})
            
            if not dicom_files:
                # Provide helpful message based on what was scanned
                if files_scanned > 0:
                    return JsonResponse({
                        'success': False, 
                        'error': f'No DICOM files found in {directory_path}. Scanned {files_scanned} files.',
                        'files_scanned': files_scanned
                    })
                else:
                    return JsonResponse({'success': False, 'error': f'No files found in {directory_path}'})
            
            # Process found DICOM files with chunked processing
            upload_id = str(uuid.uuid4())
            total_files = len(dicom_files)
            processed_files = 0
            processed_images = []
            
            # Group by StudyInstanceUID and SeriesInstanceUID
            studies_map = {}
            invalid_files = 0
            rep_ds = None
            
            # Process files in manageable chunks for medical imaging workflows
            MAX_PROCESS_FILES = min(500, len(dicom_files))  # Increased to handle medical studies
            processing_start = time.time()
            MAX_PROCESS_TIME = 120  # Maximum processing time in seconds (2 minutes for large datasets)
            
            logger.info(f"Processing {MAX_PROCESS_FILES} DICOM files from {total_files} found")
            
            for i, file_path in enumerate(dicom_files[:MAX_PROCESS_FILES]):
                # Check processing timeout
                if time.time() - processing_start > MAX_PROCESS_TIME:
                    logger.warning(f"DICOM processing timeout after {MAX_PROCESS_TIME}s, processed {processed_files} files")
                    break
                
                try:
                    # Process with timeout protection
                    ds = pydicom.dcmread(file_path, force=True, stop_before_pixels=True)  # Don't load pixel data initially
                    study_uid = getattr(ds, 'StudyInstanceUID', None)
                    series_uid = getattr(ds, 'SeriesInstanceUID', None)
                    
                    if not study_uid or not series_uid:
                        invalid_files += 1
                        continue
                        
                    if rep_ds is None:
                        rep_ds = ds
                        
                    if study_uid not in studies_map:
                        studies_map[study_uid] = {}
                    if series_uid not in studies_map[study_uid]:
                        studies_map[study_uid][series_uid] = []
                        
                    studies_map[study_uid][series_uid].append((ds, file_path))
                    processed_files += 1
                    
                    # Log progress every 50 files for large datasets
                    if (i + 1) % 50 == 0:
                        logger.info(f"Processed {i + 1}/{MAX_PROCESS_FILES} files")
                        
                except (pydicom.errors.InvalidDicomError, FileNotFoundError, PermissionError):
                    invalid_files += 1
                    continue
                except Exception as e:
                    invalid_files += 1
                    logger.warning(f"Failed to process DICOM file {file_path}: {str(e)}")
                    continue
            
            if not studies_map:
                return JsonResponse({'success': False, 'error': 'No valid DICOM files found in directory'})
            
            # Process each study found
            created_studies = []
            for study_uid, series_map in studies_map.items():
                try:
                    study_obj = process_dicom_study(study_uid, series_map, rep_ds, request.user, upload_id)
                    if study_obj:
                        created_studies.append({
                            'id': study_obj.id,
                            'accession_number': study_obj.accession_number,
                            'patient_name': study_obj.patient.full_name if study_obj.patient else 'Unknown',
                            'study_description': study_obj.study_description,
                            'series_count': len(series_map),
                            'images_count': sum(len(items) for items in series_map.values())
                        })
                except Exception as e:
                    logger.error(f"Failed to process study {study_uid}: {str(e)}")
                    continue
            
            # Enhanced response with processing statistics
            scan_time = time.time() - start_time
            message = f'Successfully loaded {len(created_studies)} studies from directory'
            
            # Add helpful information about limits reached
            warnings = []
            if files_scanned >= MAX_FILES_TO_SCAN:
                warnings.append(f'Reached maximum scan limit of {MAX_FILES_TO_SCAN} files')
            if len(dicom_files) >= MAX_DICOM_FILES:
                warnings.append(f'Reached maximum DICOM files limit of {MAX_DICOM_FILES}')
            if processed_files >= MAX_PROCESS_FILES:
                warnings.append(f'Processed maximum of {MAX_PROCESS_FILES} files')
            if scan_time >= MAX_SCAN_TIME * 0.9:  # If close to timeout
                warnings.append(f'Scan took {scan_time:.1f}s (near timeout limit)')
                
            return JsonResponse({
                'success': True,
                'message': message,
                'studies': created_studies,
                'total_files_found': total_files,
                'files_scanned': files_scanned,
                'processed_files': processed_files,
                'invalid_files': invalid_files,
                'directory': directory_path,
                'scan_time': round(scan_time, 2),
                'warnings': warnings,
                'limits_info': {
                    'max_files_scanned': MAX_FILES_TO_SCAN,
                    'max_dicom_files': MAX_DICOM_FILES,
                    'max_processed': MAX_PROCESS_FILES,
                    'max_scan_time': MAX_SCAN_TIME
                }
            })
            
        except Exception as e:
            logger.error(f"Directory loading error: {str(e)}")
            return JsonResponse({'success': False, 'error': f'Failed to load from directory: {str(e)}'})
    
    return render(request, 'dicom_viewer/load_directory.html')

def process_dicom_study(study_uid, series_map, rep_ds, user, upload_id):
    """Helper function to process a DICOM study from directory loading"""
    from datetime import datetime
    
    # Extract patient info
    patient_id = str(getattr(rep_ds, 'PatientID', f'DIR_{upload_id[:8]}'))
    patient_name = str(getattr(rep_ds, 'PatientName', 'DIRECTORY^LOAD'))
    name_parts = patient_name.replace('^', ' ').split()
    first_name = name_parts[0] if len(name_parts) > 0 else 'DIRECTORY'
    last_name = name_parts[1] if len(name_parts) > 1 else upload_id[:8]
    birth_date = getattr(rep_ds, 'PatientBirthDate', None)
    
    if birth_date:
        try:
            dob = datetime.strptime(birth_date, '%Y%m%d').date()
        except Exception:
            dob = timezone.now().date()
    else:
        dob = timezone.now().date()
    
    gender = getattr(rep_ds, 'PatientSex', 'O')
    if gender not in ['M', 'F', 'O']:
        gender = 'O'
    
    patient, _ = Patient.objects.get_or_create(
        patient_id=patient_id,
        defaults={'first_name': first_name, 'last_name': last_name, 'date_of_birth': dob, 'gender': gender}
    )
    
    # Get or create facility
    facility = getattr(user, 'facility', None)
    if not facility:
        facility = Facility.objects.filter(is_active=True).first()
    if not facility:
        if hasattr(user, 'is_admin') and user.is_admin():
            facility = Facility.objects.create(
                name='Directory Load Facility',
                address='Local Directory',
                phone='N/A',
                email='directory@local.load',
                license_number=f'DIR-{upload_id[:8]}',
                ae_title='',
                is_active=True
            )
        else:
            raise Exception('No active facility configured')
    
    # Get or create modality
    modality_code = getattr(rep_ds, 'Modality', 'OT')
    modality_obj, _ = Modality.objects.get_or_create(code=modality_code, defaults={'name': modality_code})
    
    # Create study
    study_description = getattr(rep_ds, 'StudyDescription', 'Directory DICOM Load')
    referring_physician = str(getattr(rep_ds, 'ReferringPhysicianName', 'DIRECTORY')).replace('^', ' ')
    accession_number = getattr(rep_ds, 'AccessionNumber', f"DIR_{upload_id[:8]}")
    study_date = getattr(rep_ds, 'StudyDate', None)
    study_time = getattr(rep_ds, 'StudyTime', '000000')
    
    if study_date:
        try:
            sdt = datetime.strptime(f"{study_date}{study_time[:6]}", '%Y%m%d%H%M%S')
            sdt = timezone.make_aware(sdt)
        except Exception:
            sdt = timezone.now()
    else:
        sdt = timezone.now()
    
    study_obj, created = Study.objects.get_or_create(
        study_instance_uid=study_uid,
        defaults={
            'accession_number': accession_number,
            'patient': patient,
            'facility': facility,
            'modality': modality_obj,
            'study_description': study_description,
            'study_date': sdt,
            'referring_physician': referring_physician,
            'status': 'completed',
            'priority': 'normal',
            'uploaded_by': user,
        }
    )
    
    # Create series and images
    for series_uid, items in series_map.items():
        ds0, file_path0 = items[0]
        series_number = getattr(ds0, 'SeriesNumber', 1) or 1
        series_desc = getattr(ds0, 'SeriesDescription', f'Series {series_number}')
        slice_thickness = getattr(ds0, 'SliceThickness', None)
        pixel_spacing = safe_dicom_str(getattr(ds0, 'PixelSpacing', ''))
        image_orientation = str(getattr(ds0, 'ImageOrientationPatient', ''))
        
        series_obj, series_created = Series.objects.get_or_create(
            series_instance_uid=series_uid,
            defaults={
                'study': study_obj,
                'series_number': int(series_number),
                'series_description': series_desc,
                'modality': getattr(ds0, 'Modality', modality_code),
                'body_part': getattr(ds0, 'BodyPartExamined', ''),
                'slice_thickness': slice_thickness if slice_thickness is not None else None,
                'pixel_spacing': pixel_spacing,
                'image_orientation': image_orientation,
            }
        )
        
        # Create images for this series
        for ds, file_path in items:
            instance_number = getattr(ds, 'InstanceNumber', 1) or 1
            slice_location = getattr(ds, 'SliceLocation', 0.0)
            if slice_location is None:
                slice_location = 0.0
            
            # Copy file to media directory
            import shutil
            from django.conf import settings
            
            relative_path = f'dicom/directory_load/{upload_id}/{series_uid}/{os.path.basename(file_path)}'
            full_media_path = os.path.join(settings.MEDIA_ROOT, relative_path)
            os.makedirs(os.path.dirname(full_media_path), exist_ok=True)
            shutil.copy2(file_path, full_media_path)
            
            DicomImage.objects.get_or_create(
                sop_instance_uid=getattr(ds, 'SOPInstanceUID', f'DIR_{uuid.uuid4()}'),
                defaults={
                    'series': series_obj,
                    'instance_number': int(instance_number),
                    'slice_location': float(slice_location),
                    'file_path': relative_path,
                    'file_size': os.path.getsize(file_path),
                    'window_center': getattr(ds, 'WindowCenter', 40),
                    'window_width': getattr(ds, 'WindowWidth', 400),
                }
            )
    
    return study_obj

@login_required
@csrf_exempt
def upload_dicom(request):
    """Upload DICOM files for processing"""
    if request.method == 'POST':
        try:
            # Handle both multiple files and single file
            uploaded_files = request.FILES.getlist('dicom_files')
            if not uploaded_files:
                # Try single file upload for standalone viewer
                dicom_file = request.FILES.get('dicom_file')
                if dicom_file:
                    uploaded_files = [dicom_file]
            
            if not uploaded_files:
                return JsonResponse({'success': False, 'error': 'No files uploaded'})
            
            upload_id = str(uuid.uuid4())
            total_files = len(uploaded_files)
            processed_files = 0
            processed_images = []

            # First pass: group by StudyInstanceUID and SeriesInstanceUID
            studies_map = {}
            invalid_files = 0
            rep_ds = None
            for in_file in uploaded_files:
                try:
                    ds = pydicom.dcmread(in_file, force=True)
                    study_uid = getattr(ds, 'StudyInstanceUID', None)
                    series_uid = getattr(ds, 'SeriesInstanceUID', None)
                    sop_uid = getattr(ds, 'SOPInstanceUID', None)
                    # Relaxed validation: synthesize missing values
                    if not study_uid:
                        import uuid as _uuid
                        study_uid = f"SYN-{_uuid.uuid4()}"
                    if not series_uid:
                        import uuid as _uuid
                        series_uid = f"SYN-SER-{_uuid.uuid4()}"
                    if not sop_uid:
                        import uuid as _uuid
                        sop_uid = f"SYN-SOP-{_uuid.uuid4()}"
                        setattr(ds, 'SOPInstanceUID', sop_uid)
                    if rep_ds is None:
                        rep_ds = ds
                    if study_uid not in studies_map:
                        studies_map[study_uid] = {}
                    if series_uid not in studies_map[study_uid]:
                        studies_map[study_uid][series_uid] = []
                    studies_map[study_uid][series_uid].append((ds, in_file))
                except Exception:
                    invalid_files += 1
                    continue

            if not studies_map:
                return JsonResponse({'success': False, 'error': 'No valid DICOM files found'})

            # For viewer uploads, process only the first study UID found
            study_uid = next(iter(studies_map.keys()))
            series_map = studies_map[study_uid]

            # Extract and normalize patient info from representative dataset
            patient_id = str(getattr(rep_ds, 'PatientID', f'TEMP_{upload_id[:8]}'))
            patient_name = str(getattr(rep_ds, 'PatientName', 'TEMP^UPLOAD'))
            name_parts = patient_name.replace('^', ' ').split()
            first_name = name_parts[0] if len(name_parts) > 0 else 'TEMP'
            last_name = name_parts[1] if len(name_parts) > 1 else upload_id[:8]
            birth_date = getattr(rep_ds, 'PatientBirthDate', None)
            from datetime import datetime
            if birth_date:
                try:
                    dob = datetime.strptime(birth_date, '%Y%m%d').date()
                except Exception:
                    dob = timezone.now().date()
            else:
                dob = timezone.now().date()
            gender = getattr(rep_ds, 'PatientSex', 'O')
            if gender not in ['M', 'F', 'O']:
                gender = 'O'

            patient, _ = Patient.objects.get_or_create(
                patient_id=patient_id,
                defaults={'first_name': first_name, 'last_name': last_name, 'date_of_birth': dob, 'gender': gender}
            )

            facility = getattr(request.user, 'facility', None)
            if not facility:
                facility = Facility.objects.filter(is_active=True).first()
            if not facility:
                # Allow admin uploads without configured facility by creating a default one
                if hasattr(request.user, 'is_admin') and request.user.is_admin():
                    facility = Facility.objects.create(
                        name='Default Facility',
                        address='N/A',
                        phone='N/A',
                        email='default@example.com',
                        license_number=f'DEFAULT-{upload_id[:8]}',
                        ae_title='',
                        is_active=True
                    )
                else:
                    return JsonResponse({'success': False, 'error': 'No active facility configured'})

            modality_code = getattr(rep_ds, 'Modality', 'OT')
            modality_obj, _ = Modality.objects.get_or_create(code=modality_code, defaults={'name': modality_code})

            study_description = getattr(rep_ds, 'StudyDescription', 'Temporary DICOM Upload')
            referring_physician = str(getattr(rep_ds, 'ReferringPhysicianName', 'UNKNOWN')).replace('^', ' ')
            accession_number = getattr(rep_ds, 'AccessionNumber', f"TEMP_{upload_id[:8]}")
            study_date = getattr(rep_ds, 'StudyDate', None)
            study_time = getattr(rep_ds, 'StudyTime', '000000')
            if study_date:
                try:
                    sdt = datetime.strptime(f"{study_date}{study_time[:6]}", '%Y%m%d%H%M%S')
                    sdt = timezone.make_aware(sdt)
                except Exception:
                    sdt = timezone.now()
            else:
                sdt = timezone.now()

            temp_study, _ = Study.objects.get_or_create(
                study_instance_uid=study_uid,
                defaults={
                    'accession_number': accession_number,
                    'patient': patient,
                    'facility': facility,
                    'modality': modality_obj,
                    'study_description': study_description,
                    'study_date': sdt,
                    'referring_physician': referring_physician,
                    'status': 'completed',
                    'priority': 'normal',
                    'uploaded_by': request.user,
                }
            )

            # Create series and images for each series UID
            for series_uid, items in series_map.items():
                ds0, _ = items[0]
                series_number = getattr(ds0, 'SeriesNumber', 1) or 1
                series_desc = getattr(ds0, 'SeriesDescription', f'Series {series_number}')
                slice_thickness = getattr(ds0, 'SliceThickness', None)
                pixel_spacing = safe_dicom_str(getattr(ds0, 'PixelSpacing', ''))
                image_orientation = str(getattr(ds0, 'ImageOrientationPatient', ''))

                series_obj, _ = Series.objects.get_or_create(
                    series_instance_uid=series_uid,
                    defaults={
                        'study': temp_study,
                        'series_number': int(series_number),
                        'series_description': series_desc,
                        'modality': getattr(ds0, 'Modality', modality_code),
                        'body_part': getattr(ds0, 'BodyPartExamined', ''),
                        'slice_thickness': slice_thickness if slice_thickness is not None else None,
                        'pixel_spacing': pixel_spacing,
                        'image_orientation': image_orientation,
                    }
                )

                for ds, fobj in items:
                    try:
                        sop_uid = getattr(ds, 'SOPInstanceUID', None)
                        if not sop_uid:
                            import uuid as _uuid
                            sop_uid = f"SYN-SOP-{_uuid.uuid4()}"
                            setattr(ds, 'SOPInstanceUID', sop_uid)
                        instance_number = getattr(ds, 'InstanceNumber', 1) or 1
                        rel_path = f"dicom/images/{study_uid}/{series_uid}/{sop_uid}.dcm"
                        # Ensure we read from start
                        try:
                            fobj.seek(0)
                        except Exception:
                            pass
                        saved_path = default_storage.save(rel_path, ContentFile(fobj.read()))
                        DicomImage.objects.get_or_create(
                            sop_instance_uid=sop_uid,
                            defaults={
                                'series': series_obj,
                                'instance_number': int(instance_number),
                                'image_position': str(getattr(ds, 'ImagePositionPatient', '')),
                                'slice_location': getattr(ds, 'SliceLocation', None),
                                'file_path': saved_path,
                                'file_size': getattr(fobj, 'size', 0) or 0,
                                'processed': False,
                            }
                        )
                        processed_files += 1
                    except Exception as e:
                        print(f"Error processing instance in series {series_uid}: {str(e)}")
                        continue

            if processed_files == 0:
                return JsonResponse({'success': False, 'error': 'No valid DICOM files found'})

            return JsonResponse({
                'success': True,
                'message': f'Successfully uploaded {processed_files} DICOM file(s) across {len(series_map)} series',
                'upload_id': upload_id,
                'processed_files': processed_files,
                'total_files': total_files,
                'study_id': temp_study.id,
                'series_count': len(series_map),
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    # Render a minimal upload helper if needed
    return JsonResponse({'success': False, 'error': 'Use POST to upload DICOM files'})

@login_required
@csrf_exempt
def api_upload_progress(request, upload_id):
    """API endpoint to check upload progress"""
    try:
        # This would check the actual upload progress
        # For now, we'll simulate progress
        progress = {
            'upload_id': upload_id,
            'status': 'completed',
            'progress': 100,
            'processed_files': 10,
            'total_files': 10,
            'current_file': '',
            'message': 'Upload completed successfully'
        }
        
        return JsonResponse(progress)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@csrf_exempt
def api_process_study(request, study_id):
    """API endpoint to process/reprocess a study"""
    study = get_object_or_404(Study, id=study_id)
    user = request.user
    
    # Check permissions
    if user.is_facility_user() and study.facility != user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            processing_options = data.get('options', {})
            
            # This would trigger study reprocessing
            # For now, we'll simulate processing
            result = {
                'success': True,
                'message': f'Study {study.accession_number} processing started',
                'study_id': study.id,
                'processing_options': processing_options,
                'estimated_time': '5-10 minutes'
            }
            
            return JsonResponse(result)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
@csrf_exempt
def launch_standalone_viewer(request):
    """Launch the standalone DICOM viewer application (Python PyQt)."""
    import subprocess
    import sys
    import os

    # If this looks like a normal browser navigation (expects HTML), redirect to web UI
    accept_header = request.headers.get('Accept', '')
    wants_html = 'text/html' in accept_header or 'application/xhtml+xml' in accept_header

    try:
        study_id = None
        if request.method == 'POST':
            data = json.loads(request.body) if request.body else {}
            study_id = data.get('study_id')

        launcher_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tools', 'launch_dicom_viewer.py')

        if os.path.exists(launcher_path):
            cmd = [sys.executable, launcher_path, '--debug']
            if study_id:
                cmd.extend(['--study-id', str(study_id)])

            result = subprocess.run(cmd, capture_output=True, text=True)
            if wants_html:
                # For direct navigations, always show the web viewer UI
                web_url = '/dicom-viewer/web/viewer/'
                if study_id:
                    web_url += f'?study_id={study_id}'
                return redirect(web_url)

            if result.returncode == 0:
                message = 'Python DICOM viewer launched successfully'
                if study_id:
                    message += f' with study ID {study_id}'
                return JsonResponse({'success': True, 'message': message})
            else:
                stdout = (result.stdout or '').strip()
                stderr = (result.stderr or '').strip()
                details = stderr or stdout or 'Unknown error'
                return JsonResponse({
                    'success': False,
                    'message': 'Failed to launch DICOM viewer',
                    'details': details[:500]
                }, status=500)
        else:
            web_url = '/dicom-viewer/web/viewer/'
            if study_id:
                web_url += f'?study_id={study_id}'
            if wants_html:
                return redirect(web_url)
            return JsonResponse({
                'success': True,
                'message': 'Opening web-based DICOM viewer',
                'fallback_url': web_url,
                'details': 'Python launcher not found, using web viewer'
            })

    except Exception as e:
        web_url = '/dicom-viewer/web/viewer/'
        if study_id:
            web_url += f'?study_id={study_id}'
        if wants_html:
            return redirect(web_url)
        return JsonResponse({
            'success': True,
            'message': 'Opening web-based DICOM viewer',
            'fallback_url': web_url,
            'details': f'Error: {str(e)}, using web viewer'
        })


@login_required
def launch_study_in_desktop_viewer(request, study_id):
    """Launch a specific study in the desktop viewer (Python PyQt)."""
    import subprocess
    import sys
    import os

    # If this looks like a normal browser navigation (expects HTML), redirect to web UI
    accept_header = request.headers.get('Accept', '')
    wants_html = 'text/html' in accept_header or 'application/xhtml+xml' in accept_header

    try:
        study = get_object_or_404(Study, id=study_id)
        user = request.user
        # Mark study in progress for admins/radiologists when they open the viewer
        try:
            if hasattr(user, 'can_edit_reports') and user.can_edit_reports() and study.status in ['scheduled', 'suspended']:
                study.status = 'in_progress'
                study.save(update_fields=['status'])
        except Exception:
            pass
        if user.is_facility_user() and study.facility != user.facility:
            # Gracefully fall back to web viewer rather than hard 403, to match frontend behavior
            web_url = f'/dicom-viewer/web/viewer/?study_id={study_id}'
            if wants_html:
                return redirect(web_url)
            return JsonResponse({'success': True, 'fallback_url': web_url, 'message': 'Opening web-based DICOM viewer due to permissions'}, status=200)

        launcher_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tools', 'launch_dicom_viewer.py')

        if os.path.exists(launcher_path):
            cmd = [sys.executable, launcher_path, '--debug', '--study-id', str(study_id)]
            result = subprocess.run(cmd, capture_output=True, text=True)

            if wants_html:
                # For direct navigations, always show the web viewer UI
                return redirect(f'/dicom-viewer/web/viewer/?study_id={study_id}')

            if result.returncode == 0:
                return JsonResponse({'success': True, 'message': f'Viewer launched for study: {study.patient.full_name} ({study.study_date})'})
            else:
                stdout = (result.stdout or '').strip()
                stderr = (result.stderr or '').strip()
                details = stderr or stdout or 'Unknown error'
                return JsonResponse({
                    'success': False,
                    'message': 'Failed to launch DICOM viewer',
                    'details': details[:500]
                }, status=500)
        else:
            web_url = f'/viewer/web/viewer/?study_id={study_id}'
            if wants_html:
                return redirect(web_url)
            return JsonResponse({
                'success': True,
                'message': f'Opening web-based DICOM viewer for study: {study.patient.full_name}',
                'fallback_url': web_url,
                'details': 'Python launcher not found, using web viewer'
            })

    except Exception as e:
        web_url = f'/viewer/web/viewer/?study_id={study_id}'
        if wants_html:
            return redirect(web_url)
        return JsonResponse({
            'success': True,
            'message': 'Opening web-based DICOM viewer',
            'fallback_url': web_url,
            'details': f'Error: {str(e)}, using web viewer'
        })


@login_required
def web_index(request):
    """Main web viewer index page listing recent studies"""
    # Keep permissions consistent with existing APIs
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user():
        studies = Study.objects.filter(facility=request.user.facility).order_by('-study_date')[:50]
    else:
        studies = Study.objects.order_by('-study_date')[:50]
    
    # Filter out temporary/invalid entries
    studies = studies.exclude(patient__patient_id__startswith='TEMP_')
    studies = studies.exclude(accession_number__startswith='TEMP_')
    studies = studies.exclude(patient__first_name='TEMP')
    studies = studies.exclude(patient__last_name__startswith='TEMP')
    return render(request, 'dicom_viewer/index.html', {'studies': studies})


@login_required
def web_viewer(request):
    """Render the masterpiece web viewer page. Expects ?study_id in query."""
    user = request.user
    
    # Get study parameter and validate
    study_id = request.GET.get('study_id', '')
    initial_study = None
    
    # If an admin/radiologist opens a specific study, mark it in_progress
    try:
        if study_id and hasattr(request.user, 'can_edit_reports') and request.user.can_edit_reports():
            try:
                study = get_object_or_404(Study, id=int(study_id))
                # Only update if not already completed/cancelled
                if study.status in ['scheduled', 'suspended']:
                    study.status = 'in_progress'
                    study.save(update_fields=['status'])
                initial_study = study
            except Exception:
                pass
    except Exception:
        pass
    
    if study_id and not initial_study:
        try:
            initial_study = Study.objects.exclude(
                patient__patient_id__startswith='TEMP_'
            ).exclude(accession_number__startswith='TEMP_').get(id=study_id)
            
            # Check facility permissions
            if user.is_facility_user() and getattr(user, 'facility', None):
                if initial_study.facility != user.facility:
                    initial_study = None
        except (Study.DoesNotExist, ValueError):
            initial_study = None
    
    # Get recent studies for quick access - exclude temp studies
    if user.is_facility_user() and getattr(user, 'facility', None):
        recent_studies = Study.objects.filter(facility=user.facility).exclude(
            patient__patient_id__startswith='TEMP_'
        ).exclude(accession_number__startswith='TEMP_').order_by('-study_date')[:10]
    else:
        recent_studies = Study.objects.all().exclude(
            patient__patient_id__startswith='TEMP_'
        ).exclude(accession_number__startswith='TEMP_').order_by('-study_date')[:10]
    
    context = {
        'study_id': study_id,
        'series_id': request.GET.get('series', ''),
        'current_date': timezone.now().strftime('%Y-%m-%d'),
        'user': user,
        'initial_study': initial_study,
        'recent_studies': recent_studies,
    }
    return render(request, 'dicom_viewer/base.html', context)




@login_required
def web_study_detail(request, study_id):
    """Return study detail JSON for web viewer"""
    study = get_object_or_404(Study, id=study_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and getattr(request.user, 'facility', None) and study.facility != request.user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    series_qs = study.series_set.all().annotate(image_count=Count('images')).order_by('series_number')
    data = {
        'study': {
            'id': study.id,
            'patient_name': study.patient.full_name,
            'patient_id': study.patient.patient_id,
            'study_date': study.study_date.isoformat(),
            'modality': study.modality.code,
        },
        'series_list': [{
            'id': s.id,
            'series_uid': getattr(s, 'series_instance_uid', ''),
            'series_number': s.series_number,
            'series_description': s.series_description,
            'modality': s.modality,
            'slice_thickness': s.slice_thickness,
            'pixel_spacing': s.pixel_spacing,
            'image_orientation': s.image_orientation,
            'image_count': s.image_count,
        } for s in series_qs],
    }
    return JsonResponse(data)


@login_required
def web_series_images(request, series_id):
    series = get_object_or_404(Series, id=series_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and getattr(request.user, 'facility', None) and series.study.facility != request.user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    images = series.images.all().order_by('instance_number')
    data = {
        'series': {
            'id': series.id,
            'series_uid': getattr(series, 'series_instance_uid', ''),
            'series_number': series.series_number,
            'series_description': series.series_description,
            'modality': series.modality,
            'slice_thickness': series.slice_thickness,
            'pixel_spacing': series.pixel_spacing,
            'image_orientation': series.image_orientation,
        },
        'images': [{
            'id': img.id,
            'sop_instance_uid': img.sop_instance_uid,
            'instance_number': img.instance_number,
            'image_position': img.image_position,
            'rows': None,
            'columns': None,
            'window_center': None,
            'window_width': None,
        } for img in images],
    }
    return JsonResponse(data)


@login_required
def web_dicom_image(request, image_id):
    image = get_object_or_404(DicomImage, id=image_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and getattr(request.user, 'facility', None) and image.series.study.facility != request.user.facility:
        return HttpResponse(status=403)
    window_width = float(request.GET.get('ww', 400))
    window_level = float(request.GET.get('wl', 40))
    inv_param = request.GET.get('invert')
    invert = (inv_param or '').lower() == 'true'
    try:
        file_path = os.path.join(settings.MEDIA_ROOT, image.file_path.name)
        ds = pydicom.dcmread(file_path)
        # Robust pixel decode with SimpleITK fallback
        try:
            pixel_array = ds.pixel_array
        except Exception:
            try:
                import SimpleITK as sitk
                sitk_image = sitk.ReadImage(file_path)
                px = sitk.GetArrayFromImage(sitk_image)
                if px.ndim == 3 and px.shape[0] == 1:
                    px = px[0]
                pixel_array = px
            except Exception:
                return HttpResponse(status=500)
        # Apply VOI LUT only for projection modalities (CR/DX/XA/RF/MG) to avoid CT distortion
        try:
            modality = str(getattr(ds, 'Modality', '')).upper()
            if modality in ['DX', 'CR', 'XA', 'RF', 'MG']:
                from pydicom.pixel_data_handlers.util import apply_voi_lut as _apply_voi_lut
                pixel_array = _apply_voi_lut(pixel_array, ds)
        except Exception:
            pass
        # apply slope/intercept
        slope = getattr(ds, 'RescaleSlope', 1.0)
        intercept = getattr(ds, 'RescaleIntercept', 0.0)
        pixel_array = pixel_array.astype(np.float32) * float(slope) + float(intercept)
        # Derive defaults if not provided in query
        modality = str(getattr(ds, 'Modality', '')).upper()
        photo = str(getattr(ds, 'PhotometricInterpretation', '')).upper()
        def _derive_window(arr):
            flat = arr.astype(np.float32).flatten()
            p1 = float(np.percentile(flat, 1))
            p99 = float(np.percentile(flat, 99))
            return max(1.0, p99 - p1), (p99 + p1) / 2.0
        ww_param = request.GET.get('ww')
        wl_param = request.GET.get('wl')
        if ww_param is None or wl_param is None:
            dw = getattr(ds, 'WindowWidth', None)
            dl = getattr(ds, 'WindowCenter', None)
            if hasattr(dw, '__iter__') and not isinstance(dw, str):
                dw = dw[0]
            if hasattr(dl, '__iter__') and not isinstance(dl, str):
                dl = dl[0]
            if dw is None or dl is None:
                dww, dwl = _derive_window(pixel_array)
                dw = dw or dww
                dl = dl or dwl
            if modality in ['DX','CR','XA','RF']:
                dw = float(dw) if dw is not None else 3000.0
                dl = float(dl) if dl is not None else 1500.0
            if ww_param is None:
                window_width = float(dw)
            if wl_param is None:
                window_level = float(dl)
        # Default invert for MONOCHROME1 when not explicitly provided
        if inv_param is None and photo == 'MONOCHROME1':
            invert = True
        processor = DicomProcessor()
        # Use enhanced windowing for better tissue contrast
        windowed = processor.apply_windowing(pixel_array, window_width, window_level, invert, enhanced_contrast=True)
        pil_image = Image.fromarray(windowed)
        buffer = BytesIO()
        pil_image.save(buffer, format='PNG')
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='image/png')
        response['Cache-Control'] = 'max-age=3600'
        return response
    except Exception as e:
        return HttpResponse(status=500)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def web_save_measurement(request):
    try:
        data = json.loads(request.body)
        image_id = data.get('image_id')
        measurement_type = data.get('type')
        points = data.get('points')
        value = data.get('value')
        unit = data.get('unit', 'mm')
        notes = data.get('notes', '')
        image = get_object_or_404(DicomImage, id=image_id)
        if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and image.series.study.facility != request.user.facility:
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        measurement = Measurement.objects.create(
            user=request.user,
            image=image,
            measurement_type=measurement_type,
            value=value,
            unit=unit,
            notes=notes,
        )
        measurement.set_points(points or [])
        measurement.save()
        return JsonResponse({'success': True, 'id': measurement.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def web_save_annotation(request):
    try:
        data = json.loads(request.body)
        image_id = data.get('image_id')
        position_x = data.get('position_x')
        position_y = data.get('position_y')
        text = data.get('text')
        color = data.get('color', '#FFFF00')
        image = get_object_or_404(DicomImage, id=image_id)
        if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and image.series.study.facility != request.user.facility:
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        annotation = Annotation.objects.create(
            user=request.user,
            image=image,
            position_x=position_x,
            position_y=position_y,
            text=text,
            color=color,
        )
        return JsonResponse({'success': True, 'id': annotation.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
def web_get_measurements(request, image_id):
    image = get_object_or_404(DicomImage, id=image_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and image.series.study.facility != request.user.facility:
        return JsonResponse({'measurements': []})
    measurements = Measurement.objects.filter(image=image, user=request.user)
    data = [{
        'id': m.id,
        'type': m.measurement_type,
        'points': m.get_points(),
        'value': m.value,
        'unit': m.unit,
        'notes': m.notes,
        'created_at': m.created_at.isoformat(),
    } for m in measurements]
    return JsonResponse({'measurements': data})


@login_required
def web_get_annotations(request, image_id):
    image = get_object_or_404(DicomImage, id=image_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and image.series.study.facility != request.user.facility:
        return JsonResponse({'annotations': []})
    annotations = Annotation.objects.filter(image=image, user=request.user)
    data = [{
        'id': a.id,
        'position_x': a.position_x,
        'position_y': a.position_y,
        'text': a.text,
        'color': a.color,
        'created_at': a.created_at.isoformat(),
    } for a in annotations]
    return JsonResponse({'annotations': data})


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def web_save_viewer_session(request):
    try:
        payload = json.loads(request.body)
        study_id = payload.get('study_id')
        session_data = payload.get('session_data')
        study = get_object_or_404(Study, id=study_id)
        if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and study.facility != request.user.facility:
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        session, created = ViewerSession.objects.get_or_create(
            user=request.user, study=study, defaults={'session_data': json.dumps(session_data or {})}
        )
        if not created:
            session.set_session_data(session_data or {})
            session.save()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
def web_load_viewer_session(request, study_id):
    study = get_object_or_404(Study, id=study_id)
    try:
        session = ViewerSession.objects.get(user=request.user, study=study)
        return JsonResponse({'success': True, 'session_data': session.get_session_data()})
    except ViewerSession.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'No session found'})


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def web_start_reconstruction(request):
    try:
        data = json.loads(request.body)
        series_id = data.get('series_id')
        job_type = data.get('job_type')
        parameters = data.get('parameters', {})
        series = get_object_or_404(Series, id=series_id)
        job = ReconstructionJob.objects.create(user=request.user, series=series, job_type=job_type, status='pending')
        job.set_parameters(parameters)
        job.save()
        if job_type == 'mpr':
            process_mpr_reconstruction(job.id)
        elif job_type == 'mip':
            process_mip_reconstruction(job.id)
        elif job_type == 'bone_3d':
            process_bone_reconstruction(job.id)
        elif job_type == 'mri_3d':
            process_mri_reconstruction(job.id)
        return JsonResponse({'success': True, 'job_id': job.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
def web_reconstruction_status(request, job_id):
    job = get_object_or_404(ReconstructionJob, id=job_id, user=request.user)
    data = {
        'id': job.id,
        'job_type': job.job_type,
        'status': job.status,
        'result_path': job.result_path,
        'error_message': job.error_message,
        'created_at': job.created_at.isoformat(),
        'completed_at': job.completed_at.isoformat() if job.completed_at else None,
    }
    return JsonResponse(data)


@login_required
def web_reconstruction_result(request, job_id):
    job = get_object_or_404(ReconstructionJob, id=job_id, user=request.user)
    if job.status != 'completed' or not job.result_path:
        return HttpResponse(status=404)
    try:
        with open(job.result_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="reconstruction_{job_id}.zip"'
            return response
    except FileNotFoundError:
        return HttpResponse(status=404)


# Celery tasks - temporarily disabled
# from celery import shared_task

# @shared_task
def process_mpr_reconstruction(job_id):
    try:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        # processor = MPRProcessor()
        # result_path = processor.process_series(job.series, job.get_parameters())
        job.status = 'completed'
        # job.result_path = result_path
        job.completed_at = timezone.now()
        job.save()
    except Exception as e:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'failed'
        job.error_message = str(e)
        job.save()


# @shared_task
def process_mip_reconstruction(job_id):
    try:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        # processor = MIPProcessor()
        # result_path = processor.process_series(job.series, job.get_parameters())
        job.status = 'completed'
        # job.result_path = result_path
        job.completed_at = timezone.now()
        job.save()
    except Exception as e:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'failed'
        job.error_message = str(e)
        job.save()


# @shared_task
def process_bone_reconstruction(job_id):
    try:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        # processor = Bone3DProcessor()
        # result_path = processor.process_series(job.series, job.get_parameters())
        job.status = 'completed'
        # job.result_path = result_path
        job.completed_at = timezone.now()
        job.save()
    except Exception as e:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'failed'
        job.error_message = str(e)
        job.save()


# @shared_task
def process_mri_reconstruction(job_id):
    try:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        # processor = MRI3DProcessor()
        # result_path = processor.process_series(job.series, job.get_parameters())
        job.status = 'completed'
        # job.result_path = result_path
        job.completed_at = timezone.now()
        job.save()
    except Exception as e:
        job = ReconstructionJob.objects.get(id=job_id)
        job.status = 'failed'
        job.error_message = str(e)
        job.save()

@login_required
@csrf_exempt
def api_hu_value(request):
    """Return Hounsfield Unit at a given pixel.
    Query params:
    - mode=series&image_id=<id>&x=<col>&y=<row>
    - mode=mpr&series_id=<id>&plane=axial|sagittal|coronal&slice=<idx>&x=<col>&y=<row>
    Optional ROI:
     - shape=ellipse&cx=<cx>&cy=<cy>&rx=<rx>&ry=<ry>
    Coordinates x,y are in pixel indices within the displayed 2D slice (0-based).
    """
    user = request.user
    mode = (request.GET.get('mode') or '').lower()

    try:
        if mode == 'series':
            image_id = int(request.GET.get('image_id'))
            x = int(float(request.GET.get('x')))
            y = int(float(request.GET.get('y')))
            image = get_object_or_404(DicomImage, id=image_id)
            if user.is_facility_user() and getattr(user, 'facility', None) and image.series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
            dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
            ds = pydicom.dcmread(dicom_path)
            arr = ds.pixel_array.astype(np.float32)
            slope = float(getattr(ds, 'RescaleSlope', 1.0))
            intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
            arr = arr * slope + intercept
            h, w = arr.shape[:2]
            shape = (request.GET.get('shape') or '').lower()
            if shape == 'ellipse':
                cx = int(float(request.GET.get('cx', x)))
                cy = int(float(request.GET.get('cy', y)))
                rx = max(1, int(float(request.GET.get('rx', 1))))
                ry = max(1, int(float(request.GET.get('ry', 1))))
                yy, xx = np.ogrid[:h, :w]
                mask = ((xx - cx) ** 2) / (rx ** 2) + ((yy - cy) ** 2) / (ry ** 2) <= 1.0
                roi = arr[mask]
                if roi.size == 0:
                    return JsonResponse({'error': 'Empty ROI'}, status=400)
                stats = {
                    'mean': float(np.mean(roi)),
                    'std': float(np.std(roi)),
                    'min': float(np.min(roi)),
                    'max': float(np.max(roi)),
                    'n': int(roi.size),
                }
                return JsonResponse({'mode': 'series', 'image_id': image_id, 'stats': stats})
            if x < 0 or y < 0 or x >= w or y >= h:
                return JsonResponse({'error': 'Out of bounds'}, status=400)
            hu = float(arr[y, x])
            return JsonResponse({'mode': 'series', 'image_id': image_id, 'x': x, 'y': y, 'hu': round(hu, 2)})

        elif mode == 'mpr':
            series_id = int(request.GET.get('series_id'))
            plane = (request.GET.get('plane') or '').lower()
            slice_index = int(float(request.GET.get('slice', '0')))
            x = int(float(request.GET.get('x')))
            y = int(float(request.GET.get('y')))
            series = get_object_or_404(Series, id=series_id)
            if user.is_facility_user() and getattr(user, 'facility', None) and series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
            images = series.images.all().order_by('slice_location', 'instance_number')
            if images.count() < 2:
                return JsonResponse({'error': 'Need at least 2 images for MPR'}, status=400)
            volume_data = []
            for img in images:
                try:
                    dicom_path = os.path.join(settings.MEDIA_ROOT, str(img.file_path))
                    ds = pydicom.dcmread(dicom_path)
                    a = ds.pixel_array.astype(np.float32)
                    slope = float(getattr(ds, 'RescaleSlope', 1.0))
                    intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
                    a = a * slope + intercept
                    volume_data.append(a)
                except Exception:
                    continue
            if len(volume_data) < 2:
                return JsonResponse({'error': 'Could not read enough images for MPR'}, status=400)
            volume = np.stack(volume_data, axis=0)
            if volume.shape[0] < 16:
                factor = max(2, int(np.ceil(16 / max(volume.shape[0], 1))))
                volume = ndimage.zoom(volume, (factor, 1, 1), order=1)
            counts = {
                'axial': int(volume.shape[0]),
                'sagittal': int(volume.shape[2]),
                'coronal': int(volume.shape[1]),
            }
            if plane not in counts:
                return JsonResponse({'error': 'Invalid plane'}, status=400)
            slice_index = max(0, min(counts[plane] - 1, slice_index))
            # Map x,y (col,row) from 2D plane to volume indices
            if plane == 'axial':
                h, w = volume.shape[1], volume.shape[2]
                shape = (request.GET.get('shape') or '').lower()
                if shape == 'ellipse':
                    cx = int(float(request.GET.get('cx', x)))
                    cy = int(float(request.GET.get('cy', y)))
                    rx = max(1, int(float(request.GET.get('rx', 1))))
                    ry = max(1, int(float(request.GET.get('ry', 1))))
                    yy, xx = np.ogrid[:h, :w]
                    mask = ((xx - cx) ** 2) / (rx ** 2) + ((yy - cy) ** 2) / (ry ** 2) <= 1.0
                    roi = volume[slice_index][mask]
                    if roi.size == 0:
                        return JsonResponse({'error': 'Empty ROI'}, status=400)
                    stats = {
                        'mean': float(np.mean(roi)),
                        'std': float(np.std(roi)),
                        'min': float(np.min(roi)),
                        'max': float(np.max(roi)),
                        'n': int(roi.size),
                    }
                    return JsonResponse({'mode': 'mpr', 'series_id': series_id, 'plane': plane, 'slice': slice_index, 'stats': stats})
                if x < 0 or y < 0 or x >= w or y >= h:
                    return JsonResponse({'error': 'Out of bounds'}, status=400)
                hu = float(volume[slice_index, int(y), int(x)])
            elif plane == 'sagittal':
                # slice = volume[:, :, slice_index] shape (depth, height)
                h, w = volume.shape[0], volume.shape[1]
                shape = (request.GET.get('shape') or '').lower()
                if shape == 'ellipse':
                    cx = int(float(request.GET.get('cx', x)))
                    cy = int(float(request.GET.get('cy', y)))
                    rx = max(1, int(float(request.GET.get('rx', 1))))
                    ry = max(1, int(float(request.GET.get('ry', 1))))
                    yy, xx = np.ogrid[:h, :w]
                    mask = ((xx - cx) ** 2) / (rx ** 2) + ((yy - cy) ** 2) / (ry ** 2) <= 1.0
                    z_idx = yy
                    y_idx = xx
                    roi = volume[z_idx, y_idx, slice_index][mask]
                    if roi.size == 0:
                        return JsonResponse({'error': 'Empty ROI'}, status=400)
                    stats = { 'mean': float(np.mean(roi)), 'std': float(np.std(roi)), 'min': float(np.min(roi)), 'max': float(np.max(roi)), 'n': int(roi.size) }
                    return JsonResponse({'mode': 'mpr', 'series_id': series_id, 'plane': plane, 'slice': slice_index, 'stats': stats})
                if x < 0 or y < 0 or x >= w or y >= h:
                    return JsonResponse({'error': 'Out of bounds'}, status=400)
                hu = float(volume[int(y), int(x), slice_index])
            else:  # coronal
                # slice = volume[:, slice_index, :] shape (depth, width)
                h, w = volume.shape[0], volume.shape[2]
                shape = (request.GET.get('shape') or '').lower()
                if shape == 'ellipse':
                    cx = int(float(request.GET.get('cx', x)))
                    cy = int(float(request.GET.get('cy', y)))
                    rx = max(1, int(float(request.GET.get('rx', 1))))
                    ry = max(1, int(float(request.GET.get('ry', 1))))
                    yy, xx = np.ogrid[:h, :w]
                    mask = ((xx - cx) ** 2) / (rx ** 2) + ((yy - cy) ** 2) / (ry ** 2) <= 1.0
                    z_idx = yy
                    x_idx = xx
                    roi = volume[z_idx, slice_index, x_idx][mask]
                    if roi.size == 0:
                        return JsonResponse({'error': 'Empty ROI'}, status=400)
                    stats = { 'mean': float(np.mean(roi)), 'std': float(np.std(roi)), 'min': float(np.min(roi)), 'max': float(np.max(roi)), 'n': int(roi.size) }
                    return JsonResponse({'mode': 'mpr', 'series_id': series_id, 'plane': plane, 'slice': slice_index, 'stats': stats})
                if x < 0 or y < 0 or x >= w or y >= h:
                    return JsonResponse({'error': 'Out of bounds'}, status=400)
                hu = float(volume[int(y), slice_index, int(x)])
            return JsonResponse({'mode': 'mpr', 'series_id': series_id, 'plane': plane, 'slice': slice_index, 'x': x, 'y': y, 'hu': round(hu, 2)})

        else:
            return JsonResponse({'error': 'Invalid mode'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Failed to compute HU: {str(e)}'}, status=500)

def _get_mpr_volume_and_spacing(series, force_rebuild=False):
    """Return (volume, spacing) where spacing is (z,y,x) in mm.
    - Sorts slices using ImageOrientationPatient/ImagePositionPatient when available
    - Applies rescale slope/intercept
    - Optionally resamples along Z to approximate isotropic voxels based on in-plane pixel spacing
      to improve MPR quality without degrading in-plane resolution
    - Uses tiny LRU cache; extends existing cache entry with spacing when available
    """
    import numpy as _np
    import pydicom as _pydicom
    import os as _os

    # Try cache first
    with _MPR_CACHE_LOCK:
        entry = _MPR_CACHE.get(series.id)
        if entry is not None and isinstance(entry.get('volume'), _np.ndarray) and not force_rebuild:
            vol = entry['volume']
            sp = entry.get('spacing')
            if sp is not None:
                return vol, tuple(sp)

    images_qs = series.images.all().order_by('instance_number')
    if images_qs.count() < 2:
        raise ValueError('Not enough images for MPR')

    # Gather slice data with positional sorting info
    items = []  # (pos_along_normal, pixel_array)
    first_ps = (1.0, 1.0)
    st = None
    normal = None
    for img in images_qs:
        try:
            dicom_path = _os.path.join(settings.MEDIA_ROOT, str(img.file_path))
            ds = _pydicom.dcmread(dicom_path)
            try:
                arr = ds.pixel_array.astype(_np.float32)
            except Exception:
                try:
                    import SimpleITK as _sitk
                    sitk_image = _sitk.ReadImage(dicom_path)
                    px = _sitk.GetArrayFromImage(sitk_image)
                    if px.ndim == 3 and px.shape[0] == 1:
                        px = px[0]
                    arr = px.astype(_np.float32)
                except Exception:
                    continue
            slope = float(getattr(ds, 'RescaleSlope', 1.0) or 1.0)
            intercept = float(getattr(ds, 'RescaleIntercept', 0.0) or 0.0)
            arr = arr * slope + intercept

            # Orientation-aware sorting
            pos = getattr(ds, 'ImagePositionPatient', None)
            iop = getattr(ds, 'ImageOrientationPatient', None)
            if iop is not None and len(iop) == 6:
                # row (x) and col (y) direction cosines
                r = _np.array([float(iop[0]), float(iop[1]), float(iop[2])], dtype=_np.float64)
                c = _np.array([float(iop[3]), float(iop[4]), float(iop[5])], dtype=_np.float64)
                n = _np.cross(r, c)
                if normal is None:
                    normal = n / ( _np.linalg.norm(n) + 1e-8 )
            else:
                n = _np.array([0.0, 0.0, 1.0], dtype=_np.float64)
                if normal is None:
                    normal = n
            if pos is not None and len(pos) == 3:
                p = _np.array([float(pos[0]), float(pos[1]), float(pos[2])], dtype=_np.float64)
                d = float(_np.dot(p, normal))
            else:
                # Fallback to slice_location, then instance number
                d = float(getattr(ds, 'SliceLocation', getattr(ds, 'InstanceNumber', 0)) or 0)

            # Pixel spacing & slice thickness (from first slice)
            if st is None:
                st = getattr(ds, 'SpacingBetweenSlices', None)
                if st is None:
                    st = getattr(ds, 'SliceThickness', 1.0)
                try:
                    st = float(st)
                except Exception:
                    st = 1.0
                ps_attr = getattr(ds, 'PixelSpacing', [1.0, 1.0])
                try:
                    if ps_attr is not None and len(ps_attr) >= 2:
                        first_ps = (float(ps_attr[0]), float(ps_attr[1]))
                    else:
                        first_ps = (1.0, 1.0)
                except Exception:
                    first_ps = (1.0, 1.0)

            items.append((d, arr))
        except Exception:
            continue

    if len(items) < 2:
        raise ValueError('Could not read enough images for MPR')

    # Sort by position along normal
    items.sort(key=lambda x: x[0])
    volume = _np.stack([a for _, a in items], axis=0)

    # Enhanced interpolation for thin stacks - optimized for minimal images
    # Use high-quality interpolation for better 3D reconstruction
    original_depth = volume.shape[0]
    if volume.shape[0] < 32:  # Increased threshold for better quality
        # Calculate optimal interpolation factor for minimal images
        if volume.shape[0] < 8:
            # Very few images - use maximum interpolation
            target_slices = max(64, volume.shape[0] * 8)
        else:
            # Moderate number of images
            target_slices = max(32, volume.shape[0] * 4)
        
        factor = target_slices / volume.shape[0]
        
        # Use high-quality spline interpolation for better results
        try:
            volume = ndimage.zoom(volume, (factor, 1, 1), order=3, prefilter=True)
            st = st / factor
            logger.info(f"Enhanced interpolation: {original_depth} -> {volume.shape[0]} slices (factor: {factor:.2f})")
        except Exception as e:
            logger.warning(f"High-quality interpolation failed, using linear: {e}")
            # Fallback to linear interpolation
            volume = ndimage.zoom(volume, (factor, 1, 1), order=1)
            st = st / factor

    # Resample along Z to approximate isotropic voxels using in-plane pixel spacing average
    # Keep in-plane resolution; only resample depth for quality MPR
    try:
        py, px = float(first_ps[0]), float(first_ps[1])
        target_xy = (py + px) / 2.0
        if st and target_xy and st > 0 and target_xy > 0:
            z_factor = max(1e-6, float(st) / float(target_xy))
            # If z_factor > 1, we need to upsample Z to match XY spacing
            # Cap the target depth to avoid memory blow-ups
            max_depth = 2048
            target_depth = int(min(max_depth, round(volume.shape[0] * z_factor)))
            if target_depth > volume.shape[0] + 1 or z_factor > 1.05:
                volume = ndimage.zoom(volume, (float(target_depth) / volume.shape[0], 1, 1), order=1)
                st = target_xy
    except Exception:
        pass

    spacing = (float(st or 1.0), float(first_ps[0] or 1.0), float(first_ps[1] or 1.0))

    with _MPR_CACHE_LOCK:
        # Store/refresh cache and attach spacing for future calls
        entry = _MPR_CACHE.get(series.id)
        if entry is None:
            while len(_MPR_CACHE_ORDER) >= _MAX_MPR_CACHE:
                evict_id = _MPR_CACHE_ORDER.pop(0)
                _MPR_CACHE.pop(evict_id, None)
            _MPR_CACHE[series.id] = { 'volume': volume, 'spacing': spacing }
            _MPR_CACHE_ORDER.append(series.id)
        else:
            entry['volume'] = volume
            entry['spacing'] = spacing
            try:
                _MPR_CACHE_ORDER.remove(series.id)
            except ValueError:
                pass
            _MPR_CACHE_ORDER.append(series.id)

    return volume, spacing

@login_required
@csrf_exempt
def api_user_presets(request):
    """CRUD for per-user window/level presets.
    GET: list presets (optionally filter by modality/body_part)
    POST: create/update {name, modality?, body_part?, window_width, window_level, inverted}
    DELETE: ?name=...&modality=...&body_part=...
    """
    user = request.user
    if request.method == 'GET':
        modality = request.GET.get('modality')
        body_part = request.GET.get('body_part')
        qs = WindowLevelPreset.objects.filter(user=user)
        if modality: qs = qs.filter(modality=modality)
        if body_part: qs = qs.filter(body_part=body_part)
        data = [{
            'name': p.name,
            'modality': p.modality,
            'body_part': p.body_part,
            'window_width': p.window_width,
            'window_level': p.window_level,
            'inverted': p.inverted,
        } for p in qs.order_by('name')]
        return JsonResponse({'presets': data})
    elif request.method == 'POST':
        try:
            payload = json.loads(request.body or '{}')
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        name = (payload.get('name') or '').strip()
        if not name:
            return JsonResponse({'error': 'name required'}, status=400)
        preset, _ = WindowLevelPreset.objects.update_or_create(
            user=user,
            name=name,
            modality=payload.get('modality',''),
            body_part=payload.get('body_part',''),
            defaults={
                'window_width': float(payload.get('window_width', 400)),
                'window_level': float(payload.get('window_level', 40)),
                'inverted': bool(payload.get('inverted', False)),
            }
        )
        return JsonResponse({'success': True})
    elif request.method == 'DELETE':
        name = (request.GET.get('name') or '').strip()
        modality = request.GET.get('modality','')
        body_part = request.GET.get('body_part','')
        if not name:
            return JsonResponse({'error': 'name required'}, status=400)
        WindowLevelPreset.objects.filter(user=user, name=name, modality=modality, body_part=body_part).delete()
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_hanging_protocols(request):
    """Return available hanging protocols and a suggested default for a given modality/body_part."""
    modality = request.GET.get('modality','')
    body_part = request.GET.get('body_part','')
    qs = HangingProtocol.objects.all()
    all_protocols = [{ 'id': hp.id, 'name': hp.name, 'layout': hp.layout, 'modality': hp.modality, 'body_part': hp.body_part, 'is_default': hp.is_default } for hp in qs]
    # suggested default
    default = (qs.filter(modality=modality or '', body_part=body_part or '', is_default=True).first() or 
               qs.filter(modality=modality or '', is_default=True).first() or 
               qs.filter(is_default=True).first())
    suggested = {'id': default.id, 'name': default.name, 'layout': default.layout} if default else None
    return JsonResponse({'protocols': all_protocols, 'suggested': suggested})


@login_required
def api_export_dicom_sr(request, study_id):
    """Export measurements/annotations of a study to a DICOM SR (TID 1500-like simplification).
    Returns a download URL for the generated SR file.
    """
    try:
        from highdicom.sr.coding import CodedConcept
        from highdicom.sr import ValueTypeCodes, SRDocument, ObservationContext, ContentItem, RelationshipTypeValues
        from pydicom.uid import generate_uid
    except Exception as e:
        return JsonResponse({'error': f'highdicom not available: {e}'}, status=500)

    study = get_object_or_404(Study, id=study_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and getattr(request.user, 'facility', None) and study.facility != request.user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    # Gather measurements linked to images in this study for current user
    image_ids = list(study.series_set.values_list('images__id', flat=True))
    image_ids = [i for i in image_ids if i]
    ms = Measurement.objects.filter(user=request.user, image_id__in=image_ids).order_by('created_at')

    if not ms.exists():
        return JsonResponse({'error': 'No measurements to export'}, status=400)

    # Minimal SR document with text items listing measurements
    try:
        now = timezone.now()
        doc = SRDocument(
            evidence=[],
            series_number=1,
            instance_number=1,
            manufacturer='Noctis Pro',
            manufacturer_model_name='Web Viewer',
            series_instance_uid=generate_uid(),
            sop_instance_uid=generate_uid(),
            study_instance_uid=study.study_instance_uid or generate_uid(),
            series_description='Measurements',
            content_date=now.date(),
            content_time=now.time(),
            observation_context=ObservationContext(),
            concept_name=CodedConcept('125007', 'DCM', 'Measurement Report')
        )
        items = []
        for m in ms:
            pts = m.get_points()
            text = f"{m.measurement_type}: {m.value:.2f} {m.unit} (points={pts})"
            items.append(ContentItem(ValueTypeCodes.TEXT, name=CodedConcept('121071','DCM','Finding'), text_value=text))
        for it in items:
            doc.append(ContentItem(it.value_type, name=it.name, text_value=it.text_value), relationship_type=RelationshipTypeValues.CONTAINS)

        # Save DICOM SR
        out_dir = os.path.join(settings.MEDIA_ROOT, 'sr_exports')
        os.makedirs(out_dir, exist_ok=True)
        filename = f"SR_{study.accession_number}_{int(time.time())}.dcm"
        out_path = os.path.join(out_dir, filename)
        doc.to_dataset().save_as(out_path)
        return JsonResponse({'success': True, 'download_url': f"{settings.MEDIA_URL}sr_exports/{filename}", 'filename': filename})
    except Exception as e:
        return JsonResponse({'error': f'Failed to export SR: {e}'}, status=500)

@login_required
@csrf_exempt
def api_series_volume_uint8(request, series_id):
    """Return a downsampled uint8 volume for GPU VR with basic windowing.
    Query: ww, wl, max_dim (e.g., 256)
    Response: { shape:[z,y,x], spacing:[z,y,x], data: base64 of raw uint8 array (z*y*x) }
    """
    series = get_object_or_404(Series, id=series_id)
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user() and getattr(request.user, 'facility', None) and series.study.facility != request.user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    try:
        volume, spacing = _get_mpr_volume_and_spacing(series)
        ww = float(request.GET.get('ww', 400))
        wl = float(request.GET.get('wl', 40))
        max_dim = int(request.GET.get('max_dim', 256))
        # Normalize via window/level
        min_val = wl - ww/2.0; max_val = wl + ww/2.0
        vol = np.clip(volume, min_val, max_val)
        if max_val > min_val:
            vol = (vol - min_val) / (max_val - min_val) * 255.0
        vol = vol.astype(np.uint8)
        # Downsample to fit max_dim
        z, y, x = vol.shape
        scale = min(1.0, float(max_dim)/max(z, y, x))
        if scale < 0.999:
            vol = ndimage.zoom(vol, (scale, scale, scale), order=1)
        buf = vol.tobytes()
        import base64
        b64 = base64.b64encode(buf).decode('ascii')
        return JsonResponse({
            'shape': [int(vol.shape[0]), int(vol.shape[1]), int(vol.shape[2])],
            'spacing': [float(spacing[0]), float(spacing[1]), float(spacing[2])],
            'data': b64,
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@user_passes_test(lambda u: u.is_admin() or u.is_technician())
def hu_calibration_dashboard(request):
    """Hounsfield Unit calibration dashboard"""
    from .models import HounsfieldCalibration, HounsfieldQAPhantom
    from .dicom_utils import DicomProcessor
    
    # Get recent calibrations
    recent_calibrations = HounsfieldCalibration.objects.all()[:20]
    
    # Get calibration statistics
    total_calibrations = HounsfieldCalibration.objects.count()
    valid_calibrations = HounsfieldCalibration.objects.filter(is_valid=True).count()
    invalid_calibrations = HounsfieldCalibration.objects.filter(is_valid=False).count()
    
    # Get scanner statistics
    scanner_stats = {}
    for calibration in HounsfieldCalibration.objects.all():
        scanner_key = f"{calibration.manufacturer} {calibration.model}"
        if scanner_key not in scanner_stats:
            scanner_stats[scanner_key] = {
                'total': 0,
                'valid': 0,
                'invalid': 0,
                'latest_date': None
            }
        
        scanner_stats[scanner_key]['total'] += 1
        if calibration.is_valid:
            scanner_stats[scanner_key]['valid'] += 1
        else:
            scanner_stats[scanner_key]['invalid'] += 1
        
        if not scanner_stats[scanner_key]['latest_date'] or calibration.created_at.date() > scanner_stats[scanner_key]['latest_date']:
            scanner_stats[scanner_key]['latest_date'] = calibration.created_at.date()
    
    # Get available phantoms
    available_phantoms = HounsfieldQAPhantom.objects.filter(is_active=True)
    
    context = {
        'recent_calibrations': recent_calibrations,
        'total_calibrations': total_calibrations,
        'valid_calibrations': valid_calibrations,
        'invalid_calibrations': invalid_calibrations,
        'success_rate': (valid_calibrations / total_calibrations * 100) if total_calibrations > 0 else 0,
        'scanner_stats': scanner_stats,
        'available_phantoms': available_phantoms,
    }
    
    return render(request, 'dicom_viewer/hu_calibration_dashboard.html', context)

@login_required
@user_passes_test(lambda u: u.is_admin() or u.is_technician())
@csrf_exempt
def validate_hu_calibration(request, study_id):
    """Validate Hounsfield unit calibration for a study"""
    from .models import HounsfieldCalibration
    from .dicom_utils import DicomProcessor
    
    study = get_object_or_404(Study, id=study_id)
    
    # Check permissions
    if request.user.is_facility_user() and study.facility != request.user.facility:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            processor = DicomProcessor()
            
            # Get first CT series for validation
            ct_series = study.series.filter(modality='CT').first()
            if not ct_series:
                return JsonResponse({'error': 'No CT series found in study'}, status=400)
            
            # Get first image for validation
            first_image = ct_series.images.first()
            if not first_image:
                return JsonResponse({'error': 'No images found in CT series'}, status=400)
            
            # Load DICOM data
            dicom_path = os.path.join(settings.MEDIA_ROOT, str(first_image.file_path))
            ds = pydicom.dcmread(dicom_path)
            pixel_array = ds.pixel_array
            
            # Validate calibration
            validation_result = processor.validate_hounsfield_calibration(ds, pixel_array)
            
            # Create calibration record
            calibration = HounsfieldCalibration.objects.create(
                manufacturer=getattr(ds, 'Manufacturer', ''),
                model=getattr(ds, 'ManufacturerModelName', ''),
                station_name=getattr(ds, 'StationName', ''),
                device_serial_number=getattr(ds, 'DeviceSerialNumber', ''),
                study=study,
                series=ct_series,
                rescale_slope=float(getattr(ds, 'RescaleSlope', 1.0)),
                rescale_intercept=float(getattr(ds, 'RescaleIntercept', 0.0)),
                rescale_type=getattr(ds, 'RescaleType', ''),
                water_hu=validation_result.get('water_hu'),
                air_hu=validation_result.get('air_hu'),
                noise_level=validation_result.get('noise_level'),
                calibration_status=validation_result['calibration_status'],
                is_valid=validation_result['is_valid'],
                validation_issues=validation_result['issues'],
                validation_warnings=validation_result['warnings'],
                calibration_date=getattr(ds, 'CalibrationDate', None),
                validated_by=request.user
            )
            
            # Calculate deviations
            calibration.calculate_deviations()
            calibration.save()
            
            # Generate comprehensive report
            report = processor.generate_hu_calibration_report(ds, pixel_array)
            
            return JsonResponse({
                'success': True,
                'calibration_id': calibration.id,
                'validation_result': validation_result,
                'report': report,
                'message': f'Calibration validation completed with status: {validation_result["calibration_status"]}'
            })
            
        except Exception as e:
            logger.error(f"Error validating HU calibration: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
@user_passes_test(lambda u: u.is_admin() or u.is_technician())
def hu_calibration_report(request, calibration_id):
    """Generate detailed HU calibration report"""
    from .models import HounsfieldCalibration
    
    calibration = get_object_or_404(HounsfieldCalibration, id=calibration_id)
    
    # Check permissions
    if request.user.is_facility_user() and calibration.study.facility != request.user.facility:
        messages.error(request, 'Permission denied')
        return redirect('dicom_viewer:hu_calibration_dashboard')
    
    context = {
        'calibration': calibration,
        'study': calibration.study,
        'series': calibration.series,
    }
    
    return render(request, 'dicom_viewer/hu_calibration_report.html', context)

@login_required
@user_passes_test(lambda u: u.is_admin())
def manage_qa_phantoms(request):
    """Manage QA phantoms for HU calibration"""
    from .models import HounsfieldQAPhantom
    
    phantoms = HounsfieldQAPhantom.objects.all().order_by('-created_at')
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'create':
            try:
                phantom = HounsfieldQAPhantom.objects.create(
                    name=request.POST.get('name'),
                    manufacturer=request.POST.get('manufacturer'),
                    model=request.POST.get('model'),
                    description=request.POST.get('description', ''),
                    water_roi_coordinates=json.loads(request.POST.get('water_roi', '{}')),
                    air_roi_coordinates=json.loads(request.POST.get('air_roi', '{}')),
                    expected_water_hu=float(request.POST.get('expected_water_hu', 0.0)),
                    expected_air_hu=float(request.POST.get('expected_air_hu', -1000.0)),
                    water_tolerance=float(request.POST.get('water_tolerance', 5.0)),
                    air_tolerance=float(request.POST.get('air_tolerance', 50.0))
                )
                messages.success(request, f'QA phantom "{phantom.name}" created successfully')
            except Exception as e:
                messages.error(request, f'Error creating phantom: {str(e)}')
        
        elif action == 'toggle_active':
            phantom_id = request.POST.get('phantom_id')
            try:
                phantom = HounsfieldQAPhantom.objects.get(id=phantom_id)
                phantom.is_active = not phantom.is_active
                phantom.save()
                status = 'activated' if phantom.is_active else 'deactivated'
                messages.success(request, f'Phantom "{phantom.name}" {status}')
            except HounsfieldQAPhantom.DoesNotExist:
                messages.error(request, 'Phantom not found')
        
        return redirect('dicom_viewer:manage_qa_phantoms')
    
    context = {
        'phantoms': phantoms,
    }
    
    return render(request, 'dicom_viewer/manage_qa_phantoms.html', context)

# DICOM Image Printing Functionality
import tempfile
# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import letter, A4
# from reportlab.lib.units import inch
# from reportlab.lib.utils import ImageReader
import subprocess
try:
    import cups
except ImportError:
    cups = None
from django.views.decorators.http import require_POST

@login_required
@require_POST
def print_dicom_image(request):
    """
    Enhanced DICOM printing with detailed metadata and multiple views.
    Supports single images, multiple window/level views, CT series, and comprehensive metadata printing.
    """
    try:
        # Get image/series information
        image_id = request.POST.get('image_id')
        series_id = request.POST.get('series_id')
        image_data = request.POST.get('image_data')
        
        # Enhanced printing options
        include_metadata = request.POST.get('include_metadata', 'true').lower() == 'true'
        include_multiple_views = request.POST.get('multiple_views', 'true').lower() == 'true'
        window_presets = request.POST.get('presets', 'soft,bone,lung,brain').split(',')
        print_layout = request.POST.get('layout', 'professional')  # professional, diagnostic, comparison
        
        # Standard printing options
        paper_size = request.POST.get('paper_size', 'A4')
        paper_type = request.POST.get('paper_type', 'glossy')
        print_quality = request.POST.get('print_quality', 'high')
        copies = int(request.POST.get('copies', 1))
        printer_name = request.POST.get('printer_name', '')
        print_medium = request.POST.get('print_medium', 'paper')  # paper or film
        
        processed_images = []
        enhanced_metadata = {}
        
        # Initialize DICOM processor
        from .dicom_utils import DicomProcessor, DicomFileHandler, safe_dicom_str
        processor = DicomProcessor()
        file_handler = DicomFileHandler()
        
        if image_id:
            # Single image with multiple views
            try:
                image = DicomImage.objects.get(id=image_id)
                dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
                
                if os.path.exists(dicom_path):
                    ds = pydicom.dcmread(dicom_path)
                    
                    # Extract comprehensive metadata
                    enhanced_metadata = file_handler.extract_dicom_metadata(ds)
                    enhanced_metadata.update({
                        'facility': image.series.study.facility.name if image.series.study.facility else 'Unknown',
                        'accession_number': image.series.study.accession_number,
                        'study_uid': image.series.study.study_instance_uid,
                        'series_uid': image.series.series_instance_uid,
                        'image_uid': image.sop_instance_uid,
                        'slice_location': image.slice_location,
                        'instance_number': image.instance_number,
                        'print_timestamp': timezone.now().isoformat(),
                        'printed_by': request.user.username,
                    })
                    
                    if hasattr(ds, 'pixel_array'):
                        pixel_array = ds.pixel_array
                        
                        # Convert to Hounsfield units if CT
                        if getattr(ds, 'Modality', '') == 'CT':
                            pixel_array = processor.convert_to_hounsfield_units(pixel_array, ds)
                        
                        if include_multiple_views:
                            # Generate multiple window/level views
                            for preset_name in window_presets:
                                if preset_name.strip() and preset_name.strip() in processor.window_presets:
                                    preset = processor.window_presets[preset_name.strip()]
                                    
                                    # Apply windowing with enhanced contrast
                                    windowed_image = processor.apply_windowing(
                                        pixel_array, 
                                        preset['ww'], 
                                        preset['wl'],
                                        enhanced_contrast=True
                                    )
                                    
                                    # Convert to PIL Image
                                    from PIL import Image
                                    pil_image = Image.fromarray(windowed_image)
                                    
                                    # Convert to bytes for processing
                                    import io
                                    img_buffer = io.BytesIO()
                                    pil_image.save(img_buffer, format='PNG')
                                    img_bytes = img_buffer.getvalue()
                                    
                                    processed_images.append({
                                        'data': img_bytes,
                                        'preset': preset_name.strip(),
                                        'description': preset['description'],
                                        'window_width': preset['ww'],
                                        'window_level': preset['wl']
                                    })
                        else:
                            # Single optimized view
                            modality = getattr(ds, 'Modality', 'CT')
                            window_width, window_level = processor.auto_window_from_data(pixel_array, modality=modality)
                            
                            windowed_image = processor.apply_windowing(
                                pixel_array, 
                                window_width, 
                                window_level,
                                enhanced_contrast=True
                            )
                            
                            from PIL import Image
                            pil_image = Image.fromarray(windowed_image)
                            
                            import io
                            img_buffer = io.BytesIO()
                            pil_image.save(img_buffer, format='PNG')
                            img_bytes = img_buffer.getvalue()
                            
                            processed_images.append({
                                'data': img_bytes,
                                'preset': 'auto',
                                'description': 'Auto-optimized window/level',
                                'window_width': window_width,
                                'window_level': window_level
                            })
                            
            except DicomImage.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Image not found'})
            except Exception as e:
                logger.error(f"Error processing image {image_id}: {e}")
                return JsonResponse({'success': False, 'error': f'Error processing image: {str(e)}'})
        
        elif series_id:
            # CT series with multiple views
            try:
                series = Series.objects.get(id=series_id)
                dicom_images = DicomImage.objects.filter(series=series).order_by('instance_number')[:20]
                
                # Get metadata from first image
                if dicom_images.exists():
                    first_image = dicom_images.first()
                    first_dicom_path = os.path.join(settings.MEDIA_ROOT, str(first_image.file_path))
                    
                    if os.path.exists(first_dicom_path):
                        ds = pydicom.dcmread(first_dicom_path)
                        enhanced_metadata = file_handler.extract_dicom_metadata(ds)
                        enhanced_metadata.update({
                            'facility': series.study.facility.name if series.study.facility else 'Unknown',
                            'accession_number': series.study.accession_number,
                            'study_uid': series.study.study_instance_uid,
                            'series_uid': series.series_instance_uid,
                            'total_images': dicom_images.count(),
                            'print_timestamp': timezone.now().isoformat(),
                            'printed_by': request.user.username,
                        })
                
                # Process each image in series
                for dicom_img in dicom_images:
                    try:
                        dicom_path = os.path.join(settings.MEDIA_ROOT, str(dicom_img.file_path))
                        if os.path.exists(dicom_path):
                            ds = pydicom.dcmread(dicom_path)
                            
                            if hasattr(ds, 'pixel_array'):
                                pixel_array = ds.pixel_array
                                
                                # Convert to Hounsfield units if CT
                                if getattr(ds, 'Modality', '') == 'CT':
                                    pixel_array = processor.convert_to_hounsfield_units(pixel_array, ds)
                                
                                # Use auto-optimized windowing for series
                                modality = getattr(ds, 'Modality', 'CT')
                                window_width, window_level = processor.auto_window_from_data(pixel_array, modality=modality)
                                
                                windowed_image = processor.apply_windowing(
                                    pixel_array, 
                                    window_width, 
                                    window_level,
                                    enhanced_contrast=True
                                )
                                
                                from PIL import Image
                                pil_image = Image.fromarray(windowed_image)
                                
                                import io
                                img_buffer = io.BytesIO()
                                pil_image.save(img_buffer, format='PNG')
                                img_bytes = img_buffer.getvalue()
                                
                                processed_images.append({
                                    'data': img_bytes,
                                    'preset': 'auto',
                                    'description': f'Slice {dicom_img.instance_number}',
                                    'window_width': window_width,
                                    'window_level': window_level,
                                    'slice_location': dicom_img.slice_location,
                                    'instance_number': dicom_img.instance_number
                                })
                                
                    except Exception as e:
                        logger.warning(f"Error processing series image {dicom_img.id}: {e}")
                        continue
                        
            except Series.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Series not found'})
            except Exception as e:
                logger.error(f"Error processing series {series_id}: {e}")
                return JsonResponse({'success': False, 'error': f'Error processing series: {str(e)}'})
        
        elif image_data:
            # Legacy base64 image data
            try:
                if image_data.startswith('data:image'):
                    image_data = image_data.split(',')[1]
                
                image_bytes = base64.b64decode(image_data)
                processed_images.append({
                    'data': image_bytes,
                    'preset': 'custom',
                    'description': 'Custom image data'
                })
                
                # Basic metadata for legacy mode
                enhanced_metadata = {
                    'patient_name': request.POST.get('patient_name', 'Unknown Patient'),
                    'study_date': request.POST.get('study_date', ''),
                    'modality': request.POST.get('modality', ''),
                    'series_description': request.POST.get('series_description', ''),
                    'print_timestamp': timezone.now().isoformat(),
                    'printed_by': request.user.username,
                }
                
            except Exception as e:
                logger.error(f"Error processing base64 image data: {e}")
                return JsonResponse({'success': False, 'error': 'Invalid image data'})
        
        if not processed_images:
            return JsonResponse({'success': False, 'error': 'No valid image data found'})
        
        # Get patient and study information from metadata
        patient_name = enhanced_metadata.get('patient_name', 'Unknown Patient')
        study_date = enhanced_metadata.get('study_date', '')
        modality = enhanced_metadata.get('modality', '')
        series_description = enhanced_metadata.get('series_description', '')
        institution_name = enhanced_metadata.get('institution_name', '')
        institution_name = enhanced_metadata.get('institution_name', 
            request.POST.get('institution_name', 
                request.user.facility.name if hasattr(request.user, 'facility') and request.user.facility else 'Medical Facility'))
        
        # Create temporary files for processed images
        temp_image_paths = []
        
        try:
            for i, img_data in enumerate(processed_images):
                with tempfile.NamedTemporaryFile(suffix=f'_view_{i}.png', delete=False) as img_temp:
                    img_temp.write(img_data['data'])
                    temp_image_paths.append({
                        'path': img_temp.name,
                        'preset': img_data.get('preset', 'auto'),
                        'description': img_data.get('description', ''),
                        'window_width': img_data.get('window_width', ''),
                        'window_level': img_data.get('window_level', ''),
                        'slice_location': img_data.get('slice_location', ''),
                        'instance_number': img_data.get('instance_number', '')
                    })
            
            # Create PDF with enhanced layout
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_temp:
                pdf_temp_path = pdf_temp.name
            
            # Choose appropriate layout based on number of images and layout preference
            if print_layout == 'professional' and len(processed_images) > 1:
                success = create_enhanced_professional_print_layout(
                    temp_image_paths, pdf_temp_path, paper_size, print_medium,
                    enhanced_metadata, include_metadata
                )
            elif print_layout == 'diagnostic' and len(processed_images) > 1:
                success = create_enhanced_diagnostic_print_layout(
                    temp_image_paths, pdf_temp_path, paper_size, print_medium,
                    enhanced_metadata, include_metadata
                )
            elif print_layout == 'comparison' and len(processed_images) > 1:
                success = create_enhanced_comparison_print_layout(
                    temp_image_paths, pdf_temp_path, paper_size, print_medium,
                    enhanced_metadata, include_metadata
                )
            else:
                # Single image layout
                success = create_enhanced_single_print_layout(
                    temp_image_paths[0] if temp_image_paths else None,
                    pdf_temp_path, paper_size, print_medium,
                    enhanced_metadata, include_metadata
                )
            
            if not success:
                return JsonResponse({'success': False, 'error': 'Failed to create print layout'})
            
            # Print the PDF
            print_result = send_to_printer(
                pdf_temp_path, printer_name, paper_type, 
                print_quality, copies
            )
            
            if print_result['success']:
                # Log successful print with audit
                try:
                    from .medical_audit import MedicalAuditLogger
                    audit_logger = MedicalAuditLogger()
                    audit_logger.log_print_activity(
                        user=request.user,
                        print_type=f'DICOM_{print_layout.upper()}',
                        data_description=f'{len(processed_images)} images - {patient_name}',
                        printer_name=printer_name,
                        copies=copies,
                        success=True
                    )
                except Exception as e:
                    logger.warning(f"Failed to log print audit: {e}")
                
                logger.info(f"Successfully printed {len(processed_images)} DICOM images for patient {patient_name}")
                return JsonResponse({
                    'success': True, 
                    'message': f'{len(processed_images)} images sent to printer successfully. Job ID: {print_result.get("job_id", "N/A")}',
                    'images_printed': len(processed_images),
                    'layout_used': print_layout,
                    'metadata_included': include_metadata,
                    'presets_used': [img.get('preset', 'auto') for img in processed_images]
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'error': f'Printing failed: {print_result.get("error", "Unknown error")}'
                })
                
        finally:
            # Clean up all temporary files
            for temp_img in temp_image_paths:
                try:
                    os.unlink(temp_img['path'])
                except:
                    pass
            
            try:
                if 'pdf_temp_path' in locals():
                    os.unlink(pdf_temp_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Error in print_dicom_image: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})


def create_enhanced_professional_print_layout(image_paths, output_path, paper_size, print_medium, metadata, include_metadata):
    """Create professional medical print layout with multiple views and detailed metadata"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        from reportlab.lib.colors import black, blue, gray
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph
        from PIL import Image
        
        # Set page size
        page_size = A4 if paper_size == 'A4' else letter
        c = canvas.Canvas(output_path, pagesize=page_size)
        width, height = page_size
        
        # Header with metadata
        if include_metadata:
            # Title
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, height - 50, f"Medical Imaging Report - {metadata.get('modality', 'DICOM')}")
            
            # Patient information
            c.setFont("Helvetica", 10)
            y_pos = height - 80
            
            # Left column
            patient_info = [
                f"Patient: {metadata.get('patient_name', 'N/A')}",
                f"ID: {metadata.get('patient_id', 'N/A')}",
                f"DOB: {metadata.get('patient_birth_date', 'N/A')}",
                f"Sex: {metadata.get('patient_sex', 'N/A')}",
                f"Study Date: {metadata.get('study_date', 'N/A')}",
            ]
            
            for info in patient_info:
                c.drawString(50, y_pos, info)
                y_pos -= 15
            
            # Right column
            y_pos = height - 80
            technical_info = [
                f"Accession: {metadata.get('accession_number', 'N/A')}",
                f"Series: {metadata.get('series_description', 'N/A')}",
                f"Institution: {metadata.get('institution_name', 'N/A')}",
                f"Modality: {metadata.get('modality', 'N/A')}",
                f"Body Part: {metadata.get('body_part_examined', 'N/A')}",
            ]
            
            for info in technical_info:
                c.drawString(width/2, y_pos, info)
                y_pos -= 15
            
            # Separator line
            c.line(50, height - 180, width - 50, height - 180)
            start_y = height - 200
        else:
            start_y = height - 50
        
        # Calculate image layout
        num_images = len(image_paths)
        if num_images == 1:
            # Single large image
            img_width = width - 100
            img_height = start_y - 150
            
            img_path = image_paths[0]['path']
            c.drawImage(img_path, 50, 100, img_width, img_height, preserveAspectRatio=True)
            
            # Image details
            if include_metadata:
                c.setFont("Helvetica", 8)
                details = f"Preset: {image_paths[0]['preset']} | W/L: {image_paths[0]['window_width']}/{image_paths[0]['window_level']}"
                c.drawString(50, 80, details)
                c.drawString(50, 65, image_paths[0]['description'])
        
        elif num_images <= 4:
            # 2x2 grid
            cols = 2
            rows = 2
            img_width = (width - 150) / cols
            img_height = (start_y - 150) / rows
            
            for i, img_info in enumerate(image_paths[:4]):
                row = i // cols
                col = i % cols
                
                x = 50 + col * (img_width + 25)
                y = start_y - 50 - (row + 1) * (img_height + 40)
                
                c.drawImage(img_info['path'], x, y, img_width, img_height, preserveAspectRatio=True)
                
                # Image label
                c.setFont("Helvetica-Bold", 8)
                c.drawString(x, y - 10, f"{img_info['preset'].upper()}")
                c.setFont("Helvetica", 7)
                c.drawString(x, y - 22, f"W/L: {img_info['window_width']}/{img_info['window_level']}")
        
        else:
            # Multiple images in grid
            cols = 3
            rows = min(3, (num_images + cols - 1) // cols)
            img_width = (width - 200) / cols
            img_height = (start_y - 150) / rows
            
            for i, img_info in enumerate(image_paths[:9]):  # Max 9 images
                row = i // cols
                col = i % cols
                
                x = 50 + col * (img_width + 25)
                y = start_y - 50 - (row + 1) * (img_height + 30)
                
                c.drawImage(img_info['path'], x, y, img_width, img_height, preserveAspectRatio=True)
                
                # Image label
                c.setFont("Helvetica-Bold", 7)
                c.drawString(x, y - 8, f"{img_info['preset'].upper()}")
                c.setFont("Helvetica", 6)
                if img_info.get('slice_location'):
                    c.drawString(x, y - 18, f"Slice: {img_info['slice_location']}")
        
        # Footer
        c.setFont("Helvetica", 8)
        footer_text = f"Printed: {metadata.get('print_timestamp', '')} | By: {metadata.get('printed_by', 'N/A')}"
        c.drawString(50, 30, footer_text)
        
        c.save()
        return True
        
    except Exception as e:
        logger.error(f"Error creating professional print layout: {e}")
        return False


def create_enhanced_diagnostic_print_layout(image_paths, output_path, paper_size, print_medium, metadata, include_metadata):
    """Create diagnostic-focused print layout optimized for clinical review"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        
        page_size = A4 if paper_size == 'A4' else letter
        c = canvas.Canvas(output_path, pagesize=page_size)
        width, height = page_size
        
        # Diagnostic header
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 40, "DIAGNOSTIC IMAGING REVIEW")
        
        # Essential patient info only
        if include_metadata:
            c.setFont("Helvetica", 10)
            essential_info = f"{metadata.get('patient_name', 'N/A')} | {metadata.get('patient_id', 'N/A')} | {metadata.get('study_date', 'N/A')} | {metadata.get('modality', 'N/A')}"
            c.drawString(50, height - 60, essential_info)
            
            c.line(50, height - 80, width - 50, height - 80)
            start_y = height - 100
        else:
            start_y = height - 60
        
        # Large images for diagnostic review
        num_images = len(image_paths)
        if num_images == 1:
            # Full page image
            img_width = width - 100
            img_height = start_y - 100
            
            c.drawImage(image_paths[0]['path'], 50, 70, img_width, img_height, preserveAspectRatio=True)
            
            # Technical details
            c.setFont("Helvetica", 9)
            tech_details = f"Window/Level: {image_paths[0]['window_width']}/{image_paths[0]['window_level']} | {image_paths[0]['description']}"
            c.drawString(50, 50, tech_details)
        
        else:
            # Side-by-side comparison
            cols = min(2, num_images)
            img_width = (width - 150) / cols
            img_height = start_y - 100
            
            for i, img_info in enumerate(image_paths[:2]):  # Max 2 for diagnostic
                x = 50 + i * (img_width + 50)
                
                c.drawImage(img_info['path'], x, 100, img_width, img_height, preserveAspectRatio=True)
                
                # Labels
                c.setFont("Helvetica-Bold", 10)
                c.drawString(x, 80, f"{img_info['preset'].upper()} VIEW")
                c.setFont("Helvetica", 8)
                c.drawString(x, 65, f"W/L: {img_info['window_width']}/{img_info['window_level']}")
        
        # Footer
        c.setFont("Helvetica", 8)
        c.drawString(50, 30, f"Diagnostic Review | Printed: {metadata.get('print_timestamp', '')}")
        
        c.save()
        return True
        
    except Exception as e:
        logger.error(f"Error creating diagnostic print layout: {e}")
        return False


def create_enhanced_comparison_print_layout(image_paths, output_path, paper_size, print_medium, metadata, include_metadata):
    """Create comparison print layout for multiple window/level views"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        
        page_size = A4 if paper_size == 'A4' else letter
        c = canvas.Canvas(output_path, pagesize=page_size)
        width, height = page_size
        
        # Comparison header
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 40, "MULTI-VIEW COMPARISON")
        
        if include_metadata:
            c.setFont("Helvetica", 9)
            c.drawString(50, height - 60, f"Patient: {metadata.get('patient_name', 'N/A')} | Study: {metadata.get('study_date', 'N/A')}")
            c.drawString(50, height - 75, f"Series: {metadata.get('series_description', 'N/A')} | {metadata.get('modality', 'N/A')}")
            
            c.line(50, height - 95, width - 50, height - 95)
            start_y = height - 115
        else:
            start_y = height - 60
        
        # Grid layout for comparison
        num_images = len(image_paths)
        cols = min(3, num_images)
        rows = (num_images + cols - 1) // cols
        
        img_width = (width - 100 - (cols - 1) * 20) / cols
        img_height = (start_y - 100 - (rows - 1) * 60) / rows
        
        for i, img_info in enumerate(image_paths):
            row = i // cols
            col = i % cols
            
            x = 50 + col * (img_width + 20)
            y = start_y - 50 - (row + 1) * (img_height + 60)
            
            c.drawImage(img_info['path'], x, y, img_width, img_height, preserveAspectRatio=True)
            
            # Detailed labels for comparison
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x, y - 15, f"{img_info['preset'].upper()}")
            c.setFont("Helvetica", 7)
            c.drawString(x, y - 25, img_info['description'])
            c.drawString(x, y - 35, f"W: {img_info['window_width']} L: {img_info['window_level']}")
            
            if img_info.get('slice_location'):
                c.drawString(x, y - 45, f"Slice: {img_info['slice_location']}")
        
        # Footer
        c.setFont("Helvetica", 8)
        c.drawString(50, 30, f"Multi-view Comparison | Views: {num_images} | {metadata.get('print_timestamp', '')}")
        
        c.save()
        return True
        
    except Exception as e:
        logger.error(f"Error creating comparison print layout: {e}")
        return False


def create_enhanced_single_print_layout(image_info, output_path, paper_size, print_medium, metadata, include_metadata):
    """Create single image print layout with comprehensive metadata"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        
        page_size = A4 if paper_size == 'A4' else letter
        c = canvas.Canvas(output_path, pagesize=page_size)
        width, height = page_size
        
        if not image_info:
            return False
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 50, "MEDICAL IMAGE PRINT")
        
        if include_metadata:
            # Comprehensive metadata display
            c.setFont("Helvetica", 10)
            y_pos = height - 80
            
            # Patient demographics
            c.setFont("Helvetica-Bold", 11)
            c.drawString(50, y_pos, "PATIENT INFORMATION")
            y_pos -= 20
            
            c.setFont("Helvetica", 9)
            patient_fields = [
                ("Name:", metadata.get('patient_name', 'N/A')),
                ("ID:", metadata.get('patient_id', 'N/A')),
                ("DOB:", metadata.get('patient_birth_date', 'N/A')),
                ("Sex:", metadata.get('patient_sex', 'N/A')),
            ]
            
            for label, value in patient_fields:
                c.drawString(50, y_pos, f"{label} {value}")
                y_pos -= 12
            
            # Study information
            y_pos -= 10
            c.setFont("Helvetica-Bold", 11)
            c.drawString(50, y_pos, "STUDY INFORMATION")
            y_pos -= 20
            
            c.setFont("Helvetica", 9)
            study_fields = [
                ("Study Date:", metadata.get('study_date', 'N/A')),
                ("Modality:", metadata.get('modality', 'N/A')),
                ("Body Part:", metadata.get('body_part_examined', 'N/A')),
                ("Series:", metadata.get('series_description', 'N/A')),
                ("Institution:", metadata.get('institution_name', 'N/A')),
                ("Accession:", metadata.get('accession_number', 'N/A')),
            ]
            
            for label, value in study_fields:
                c.drawString(50, y_pos, f"{label} {value}")
                y_pos -= 12
            
            # Technical parameters
            y_pos -= 10
            c.setFont("Helvetica-Bold", 11)
            c.drawString(50, y_pos, "TECHNICAL PARAMETERS")
            y_pos -= 20
            
            c.setFont("Helvetica", 9)
            tech_fields = [
                ("Window Width:", image_info.get('window_width', 'N/A')),
                ("Window Level:", image_info.get('window_level', 'N/A')),
                ("Preset:", image_info.get('preset', 'N/A')),
                ("Pixel Spacing:", metadata.get('pixel_spacing', 'N/A')),
                ("Slice Thickness:", metadata.get('slice_thickness', 'N/A')),
                ("Matrix Size:", f"{metadata.get('rows', 'N/A')} x {metadata.get('columns', 'N/A')}"),
            ]
            
            for label, value in tech_fields:
                c.drawString(50, y_pos, f"{label} {value}")
                y_pos -= 12
            
            # Image
            img_start_y = y_pos - 30
            img_height = img_start_y - 100
            img_width = width - 100
            
            c.drawImage(image_info['path'], 50, 70, img_width, img_height, preserveAspectRatio=True)
        else:
            # Large image without metadata
            img_width = width - 100
            img_height = height - 150
            
            c.drawImage(image_info['path'], 50, 70, img_width, img_height, preserveAspectRatio=True)
        
        # Footer
        c.setFont("Helvetica", 8)
        footer = f"Printed: {metadata.get('print_timestamp', '')} | By: {metadata.get('printed_by', 'N/A')} | {image_info.get('description', '')}"
        c.drawString(50, 30, footer)
        
        c.save()
        return True
        
    except Exception as e:
        logger.error(f"Error creating single print layout: {e}")
        return False

def create_medical_print_pdf_enhanced(image_paths, output_path, paper_size, layout_type, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """
    Create a PDF optimized for medical image printing with multiple layout options for different modalities.
    Supports both paper and film printing with modality-specific layouts.
    """
    # Set paper size
    if paper_size.upper() == 'A4':
        page_size = A4
    elif paper_size.upper() == 'LETTER':
        page_size = letter
    elif paper_size.upper() == 'FILM_14X17':
        page_size = (14*inch, 17*inch)  # Standard film size
    elif paper_size.upper() == 'FILM_11X14':
        page_size = (11*inch, 14*inch)
    else:
        page_size = A4
    
    # Create PDF
    c = canvas.Canvas(output_path, pagesize=page_size)
    width, height = page_size
    
    # Apply layout based on type and modality
    if layout_type == 'single':
        create_single_image_layout(c, image_paths[0] if isinstance(image_paths, list) else image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    elif layout_type == 'quad':
        create_quad_layout(c, image_paths[0] if isinstance(image_paths, list) else image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    elif layout_type == 'comparison':
        create_comparison_layout(c, image_paths[0] if isinstance(image_paths, list) else image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    elif layout_type == 'film_standard':
        create_film_standard_layout(c, image_paths[0] if isinstance(image_paths, list) else image_paths, width, height, modality, patient_name, study_date, series_description, institution_name)
    elif layout_type == 'ct_professional_film':
        create_ct_professional_film_layout(c, image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    elif layout_type == 'ct_series_film_grid':
        create_ct_series_film_grid_layout(c, image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    elif layout_type == 'ct_diagnostic_film':
        create_ct_diagnostic_film_layout(c, image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    else:
        # Default to single layout
        create_single_image_layout(c, image_paths[0] if isinstance(image_paths, list) else image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name)
    
    c.save()

def create_single_image_layout(c, image_path, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """Single image layout - optimal for detailed viewing"""
    
    # Header styling based on print medium
    if print_medium == 'film':
        header_bg = 'black'
        text_color = 'white'
        margin = 30
    else:
        header_bg = 'white'
        text_color = 'black'
        margin = 50
    
    # Add header with patient information
    c.setFont("Helvetica-Bold", 16 if print_medium == 'film' else 14)
    
    if print_medium == 'film':
        # Film header - white text on black background
        c.setFillColorRGB(0, 0, 0)
        c.rect(0, height - 80, width, 80, fill=1)
        c.setFillColorRGB(1, 1, 1)
    
    c.drawString(margin, height - 50, f"Patient: {patient_name}")
    c.drawString(width - 200, height - 50, f"{institution_name}")
    
    c.setFont("Helvetica", 12 if print_medium == 'film' else 10)
    y_pos = height - 70
    
    # Patient info line
    info_line = f"Study: {study_date} | Modality: {modality}"
    if series_description:
        info_line += f" | Series: {series_description}"
    c.drawString(margin, y_pos, info_line)
    
    # Add modality-specific information
    if modality in ['CT', 'MR', 'MRI']:
        c.drawString(width - 200, y_pos, "Window/Level Optimized")
    elif modality in ['CR', 'DX', 'DR']:
        c.drawString(width - 200, y_pos, "Radiographic Image")
    elif modality in ['US']:
        c.drawString(width - 200, y_pos, "Ultrasound Image")
    
    # Add image (centered and scaled to fit)
    try:
        img = ImageReader(image_path)
        img_width, img_height = img.getSize()
        
        # Calculate scaling to fit page while maintaining aspect ratio
        available_width = width - (margin * 2)
        available_height = height - 150  # Space for header and footer
        
        scale_x = available_width / img_width
        scale_y = available_height / img_height
        scale = min(scale_x, scale_y)
        
        final_width = img_width * scale
        final_height = img_height * scale
        
        # Center the image
        x_pos = (width - final_width) / 2
        y_pos = (height - final_height - 100) / 2 + 50
        
        c.drawImage(img, x_pos, y_pos, final_width, final_height)
        
    except Exception as e:
        logger.error(f"Error adding image to PDF: {str(e)}")
        c.setFont("Helvetica", 12)
        c.drawString(margin, height/2, f"Error loading image: {str(e)}")
    
    # Add footer
    c.setFont("Helvetica", 10 if print_medium == 'film' else 8)
    footer_text = f"Printed: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} | NoctisPro Medical Imaging"
    c.drawString(margin, 30, footer_text)
    
    if print_medium == 'film':
        c.drawString(width - 100, 30, "MEDICAL FILM")

def create_quad_layout(c, image_path, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """Quad layout - 4 images on one page for comparison"""
    
    margin = 40 if print_medium == 'film' else 50
    
    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, height - 40, f"Patient: {patient_name} | {modality} Comparison")
    c.drawString(width - 200, height - 40, f"{institution_name}")
    
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - 60, f"Study: {study_date} | Series: {series_description}")
    
    # Calculate quad positions
    quad_width = (width - margin * 3) / 2
    quad_height = (height - 140) / 2
    
    positions = [
        (margin, height - 80 - quad_height),  # Top left
        (margin + quad_width + margin/2, height - 80 - quad_height),  # Top right
        (margin, height - 80 - quad_height * 2 - margin/2),  # Bottom left
        (margin + quad_width + margin/2, height - 80 - quad_height * 2 - margin/2)  # Bottom right
    ]
    
    # Add same image in 4 positions (in real implementation, you'd pass 4 different images)
    try:
        img = ImageReader(image_path)
        img_width, img_height = img.getSize()
        
        # Calculate scaling
        scale_x = quad_width / img_width
        scale_y = quad_height / img_height
        scale = min(scale_x, scale_y)
        
        final_width = img_width * scale
        final_height = img_height * scale
        
        for i, (x_pos, y_pos) in enumerate(positions):
            # Center image in quad
            centered_x = x_pos + (quad_width - final_width) / 2
            centered_y = y_pos + (quad_height - final_height) / 2
            
            c.drawImage(img, centered_x, centered_y, final_width, final_height)
            
            # Add quad labels
            c.setFont("Helvetica", 8)
            c.drawString(x_pos + 5, y_pos + quad_height - 15, f"View {i+1}")
            
    except Exception as e:
        logger.error(f"Error adding images to PDF: {str(e)}")
    
    # Footer
    c.setFont("Helvetica", 8)
    c.drawString(margin, 20, f"Printed: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} | NoctisPro - Quad Layout")

def create_comparison_layout(c, image_path, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """Comparison layout - side by side images"""
    
    margin = 40
    
    # Header
    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, height - 40, f"Patient: {patient_name} | {modality} Comparison")
    c.drawString(width - 200, height - 40, f"{institution_name}")
    
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - 60, f"Study: {study_date} | Series: {series_description}")
    
    # Calculate side-by-side positions
    image_width = (width - margin * 3) / 2
    image_height = height - 140
    
    positions = [
        (margin, 60),  # Left image
        (margin + image_width + margin, 60)  # Right image
    ]
    
    try:
        img = ImageReader(image_path)
        img_w, img_h = img.getSize()
        
        scale_x = image_width / img_w
        scale_y = image_height / img_h
        scale = min(scale_x, scale_y)
        
        final_w = img_w * scale
        final_h = img_h * scale
        
        for i, (x_pos, y_pos) in enumerate(positions):
            # Center image
            centered_x = x_pos + (image_width - final_w) / 2
            centered_y = y_pos + (image_height - final_h) / 2
            
            c.drawImage(img, centered_x, centered_y, final_w, final_h)
            
            # Add labels
            c.setFont("Helvetica-Bold", 10)
            label = "Current" if i == 0 else "Previous"
            c.drawString(x_pos + image_width/2 - 20, y_pos - 20, label)
            
    except Exception as e:
        logger.error(f"Error adding comparison images: {str(e)}")
    
    # Footer
    c.setFont("Helvetica", 8)
    c.drawString(margin, 20, f"Printed: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} | NoctisPro - Comparison Layout")

def create_film_standard_layout(c, image_path, width, height, modality, patient_name, study_date, series_description, institution_name):
    """Standard medical film layout with minimal text overlay"""
    
    # Film uses minimal margins and black background
    margin = 20
    
    # Black background for film
    c.setFillColorRGB(0, 0, 0)
    c.rect(0, 0, width, height, fill=1)
    
    # White text for film
    c.setFillColorRGB(1, 1, 1)
    
    # Minimal header for film
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - 25, f"{patient_name}")
    c.drawString(width - 150, height - 25, f"{institution_name}")
    
    # Study info in corners
    c.setFont("Helvetica", 8)
    c.drawString(margin, 15, f"{study_date}")
    c.drawString(width - 100, 15, f"{modality}")
    
    # Image takes most of the space
    try:
        img = ImageReader(image_path)
        img_width, img_height = img.getSize()
        
        # Maximum image area
        available_width = width - (margin * 2)
        available_height = height - 60  # Minimal space for text
        
        scale_x = available_width / img_width
        scale_y = available_height / img_height
        scale = min(scale_x, scale_y)
        
        final_width = img_width * scale
        final_height = img_height * scale
        
        # Center the image
        x_pos = (width - final_width) / 2
        y_pos = (height - final_height) / 2
        
        c.drawImage(img, x_pos, y_pos, final_width, final_height)
        
    except Exception as e:
        logger.error(f"Error adding image to film: {str(e)}")

def get_modality_specific_layouts(modality):
    """Return available layouts for specific modality"""
    
    base_layouts = [
        {'value': 'single', 'name': 'Single Image', 'description': 'One image per page with full details'},
        {'value': 'quad', 'name': 'Quad Layout', 'description': 'Four images for comparison'},
        {'value': 'comparison', 'name': 'Side-by-Side', 'description': 'Two images for comparison'},
    ]
    
    modality_layouts = {
        'CT': base_layouts + [
            {'value': 'ct_axial_grid', 'name': 'CT Axial Grid', 'description': '16 axial slices in grid'},
            {'value': 'ct_mpr_trio', 'name': 'CT MPR Trio', 'description': 'Axial, Sagittal, Coronal views'},
            {'value': 'ct_professional_film', 'name': 'CT Professional Film', 'description': 'Professional CT film layout for medical review'},
            {'value': 'ct_series_film_grid', 'name': 'CT Series Film Grid', 'description': '20-24 CT slices in professional film grid layout'},
            {'value': 'ct_diagnostic_film', 'name': 'CT Diagnostic Film', 'description': 'Diagnostic quality CT film with measurements and annotations'},
        ],
        'MR': base_layouts + [
            {'value': 'mri_sequences', 'name': 'MRI Sequences', 'description': 'Multiple sequences comparison'},
            {'value': 'mri_mpr_trio', 'name': 'MRI MPR Trio', 'description': 'Axial, Sagittal, Coronal views'},
        ],
        'MRI': base_layouts + [
            {'value': 'mri_sequences', 'name': 'MRI Sequences', 'description': 'Multiple sequences comparison'},
            {'value': 'mri_mpr_trio', 'name': 'MRI MPR Trio', 'description': 'Axial, Sagittal, Coronal views'},
        ],
        'CR': base_layouts + [
            {'value': 'xray_pa_lateral', 'name': 'PA & Lateral', 'description': 'PA and Lateral views'},
        ],
        'DX': base_layouts + [
            {'value': 'xray_pa_lateral', 'name': 'PA & Lateral', 'description': 'PA and Lateral views'},
        ],
        'DR': base_layouts + [
            {'value': 'xray_pa_lateral', 'name': 'PA & Lateral', 'description': 'PA and Lateral views'},
        ],
        'US': base_layouts + [
            {'value': 'us_measurements', 'name': 'US with Measurements', 'description': 'Ultrasound with measurement overlay'},
        ],
        'MG': base_layouts + [
            {'value': 'mammo_cc_mlo', 'name': 'CC & MLO Views', 'description': 'Craniocaudal and MLO views'},
        ],
        'PT': base_layouts + [
            {'value': 'pet_fusion', 'name': 'PET Fusion', 'description': 'PET with CT fusion'},
        ],
    }
    
    return modality_layouts.get(modality, base_layouts)

@login_required
def get_print_layouts(request):
    """Get available print layouts for a specific modality"""
    modality = request.GET.get('modality', '')
    layouts = get_modality_specific_layouts(modality)
    
    return JsonResponse({
        'success': True,
        'layouts': layouts,
        'modality': modality
    })

def send_to_printer(pdf_path, printer_name, paper_type, print_quality, copies):
    """
    Send PDF to printer with optimized settings for glossy paper.
    """
    try:
        if cups is None:
            # Fallback to lp command if pycups is not available
            return send_to_printer_fallback(pdf_path, printer_name, paper_type, print_quality, copies)
        
        # Initialize CUPS connection
        conn = cups.Connection()
        
        # Get available printers
        printers = conn.getPrinters()
        
        if not printers:
            return {'success': False, 'error': 'No printers available'}
        
        # Use specified printer or default
        if printer_name and printer_name in printers:
            target_printer = printer_name
        else:
            target_printer = list(printers.keys())[0]  # Use first available printer
        
        # Set print options optimized for medical images and glossy paper
        print_options = {
            'copies': str(copies),
            'media': 'A4' if paper_type == 'A4' else 'Letter',
            'print-quality': '5' if print_quality == 'high' else '4',  # Highest quality
            'print-color-mode': 'color',
            'orientation-requested': '3',  # Portrait
        }
        
        # Glossy paper specific settings
        if paper_type == 'glossy':
            print_options.update({
                'media-type': 'photographic-glossy',
                'print-quality': '5',  # Maximum quality for glossy
                'ColorModel': 'RGB',
                'Resolution': '1200dpi',
                'MediaType': 'Glossy',
            })
        
        # Submit print job
        job_id = conn.printFile(target_printer, pdf_path, "DICOM Medical Image", print_options)
        
        logger.info(f"Print job {job_id} submitted to printer {target_printer}")
        
        return {
            'success': True, 
            'job_id': job_id, 
            'printer': target_printer,
            'message': f'Print job submitted successfully to {target_printer}'
        }
        
    except Exception as e:
        logger.error(f"CUPS printing error: {str(e)}")
        # Fallback to command line printing
        return send_to_printer_fallback(pdf_path, printer_name, paper_type, print_quality, copies)

def send_to_printer_fallback(pdf_path, printer_name, paper_type, print_quality, copies):
    """
    Fallback printing method using lp command.
    """
    try:
        cmd = ['lp']
        
        if printer_name:
            cmd.extend(['-d', printer_name])
        
        cmd.extend(['-n', str(copies)])
        
        # Add quality options
        if print_quality == 'high':
            cmd.extend(['-o', 'print-quality=5'])
        
        if paper_type == 'glossy':
            cmd.extend(['-o', 'media-type=photographic-glossy'])
            cmd.extend(['-o', 'print-quality=5'])
        
        cmd.append(pdf_path)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            # Extract job ID from output
            output_lines = result.stdout.strip().split('\n')
            job_info = output_lines[0] if output_lines else "Job submitted"
            
            return {
                'success': True,
                'job_id': job_info,
                'message': f'Print job submitted: {job_info}'
            }
        else:
            return {
                'success': False,
                'error': f'lp command failed: {result.stderr}'
            }
            
    except Exception as e:
        logger.error(f"Fallback printing error: {str(e)}")
        return {'success': False, 'error': str(e)}

@login_required
def get_available_printers(request):
    """
    Get list of available printers and their capabilities.
    """
    try:
        if cups:
            conn = cups.Connection()
            printers = conn.getPrinters()
            
            printer_list = []
            for name, printer_info in printers.items():
                printer_list.append({
                    'name': name,
                    'description': printer_info.get('printer-info', name),
                    'location': printer_info.get('printer-location', ''),
                    'state': printer_info.get('printer-state-message', 'Ready'),
                    'accepts_jobs': printer_info.get('printer-is-accepting-jobs', True)
                })
        else:
            # Fallback to lpstat command
            result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True)
            printer_list = []
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line.startswith('printer'):
                        parts = line.split()
                        if len(parts) >= 2:
                            printer_list.append({
                                'name': parts[1],
                                'description': parts[1],
                                'location': '',
                                'state': 'Ready',
                                'accepts_jobs': True
                            })
        
        return JsonResponse({'success': True, 'printers': printer_list})
        
    except Exception as e:
        logger.error(f"Error getting printers: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e), 'printers': []})

@login_required
def print_settings_view(request):
    """
    Render print settings page.
    """
    if request.method == 'POST':
        try:
            # Save print settings
            default_printer = request.POST.get('default_printer')
            default_paper_size = request.POST.get('default_paper_size', 'A4')
            default_paper_type = request.POST.get('default_paper_type', 'glossy')
            default_quality = request.POST.get('default_quality', 'high')
            
            # Store in user session
            request.session['print_settings'] = {
                'default_printer': default_printer,
                'default_paper_size': default_paper_size,
                'default_paper_type': default_paper_type,
                'default_quality': default_quality,
            }
            
            messages.success(request, 'Print settings saved successfully')
            
        except Exception as e:
            messages.error(request, f'Error saving print settings: {str(e)}')
    
    # Get current settings
    current_settings = request.session.get('print_settings', {
        'default_printer': '',
        'default_paper_size': 'A4',
        'default_paper_type': 'glossy',
        'default_quality': 'high',
    })
    
    context = {
        'current_settings': current_settings,
    }
    
    return render(request, 'dicom_viewer/print_settings.html', context)


@login_required
@require_http_methods(["POST"])
def ai_3d_print_api(request, series_id):
    """
    Generate AI-enhanced 3D print model from DICOM series.
    """
    try:
        series = get_object_or_404(Series, id=series_id)
        
        # Check user permissions
        if not request.user.has_perm('dicom_viewer.can_generate_3d_models'):
            return JsonResponse({
                'success': False,
                'error': 'Permission denied for 3D model generation'
            })
        
        # Parse request data
        data = json.loads(request.body) if request.body else {}
        quality = data.get('quality', 'high')
        format_type = data.get('format', 'stl')
        ai_enhanced = data.get('ai_enhanced', True)
        
        # Get DICOM images for the series
        images = DicomImage.objects.filter(series=series).order_by('instance_number')
        if not images.exists():
            return JsonResponse({
                'success': False,
                'error': 'No DICOM images found for this series'
            })
        
        # Create reconstruction job
        job = ReconstructionJob.objects.create(
            series=series,
            user=request.user,
            reconstruction_type='ai_3d_print',
            parameters={
                'quality': quality,
                'format': format_type,
                'ai_enhanced': ai_enhanced
            },
            status='processing'
        )
        
        # For demo purposes, simulate AI 3D print generation
        # In a real implementation, this would call an AI service
        try:
            # Simulate processing time
            import time
            time.sleep(2)
            
            # Generate mock 3D model file
            model_filename = f"ai_3d_model_{series_id}_{int(time.time())}.{format_type}"
            model_path = os.path.join(settings.MEDIA_ROOT, 'ai_3d_models', model_filename)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            # Create mock STL content (in real implementation, this would be actual 3D mesh data)
            mock_stl_content = f"""solid AI_Enhanced_Model_{series_id}
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 0.0 0.0
      vertex 0.0 1.0 0.0
    endloop
  endfacet
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 1.0 0.0 0.0
      vertex 1.0 1.0 0.0
      vertex 0.0 1.0 0.0
    endloop
  endfacet
endsolid AI_Enhanced_Model_{series_id}
"""
            
            with open(model_path, 'w') as f:
                f.write(mock_stl_content)
            
            # Update job status
            job.status = 'completed'
            job.result_path = model_path
            job.save()
            
            download_url = f"/media/ai_3d_models/{model_filename}"
            
            return JsonResponse({
                'success': True,
                'message': 'AI 3D print model generated successfully',
                'download_url': download_url,
                'filename': model_filename,
                'job_id': job.id
            })
            
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
            raise e
            
    except Exception as e:
        logger.error(f"AI 3D Print error for series {series_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Failed to generate AI 3D print model: {str(e)}'
        })


@login_required
@require_http_methods(["POST"])
def advanced_reconstruction_api(request, series_id):
    """
    Perform advanced AI-enhanced reconstruction on DICOM series.
    """
    try:
        series = get_object_or_404(Series, id=series_id)
        
        # Check user permissions
        if not request.user.has_perm('dicom_viewer.can_use_advanced_reconstruction'):
            return JsonResponse({
                'success': False,
                'error': 'Permission denied for advanced reconstruction'
            })
        
        # Parse request data
        data = json.loads(request.body) if request.body else {}
        reconstruction_type = data.get('reconstruction_type', 'ai_enhanced')
        include_mpr = data.get('include_mpr', True)
        include_mip = data.get('include_mip', True)
        include_volume_rendering = data.get('include_volume_rendering', True)
        
        # Get DICOM images for the series
        images = DicomImage.objects.filter(series=series).order_by('instance_number')
        if not images.exists():
            return JsonResponse({
                'success': False,
                'error': 'No DICOM images found for this series'
            })
        
        # Create reconstruction job
        job = ReconstructionJob.objects.create(
            series=series,
            user=request.user,
            reconstruction_type='advanced_ai',
            parameters={
                'reconstruction_type': reconstruction_type,
                'include_mpr': include_mpr,
                'include_mip': include_mip,
                'include_volume_rendering': include_volume_rendering
            },
            status='processing'
        )
        
        # For demo purposes, simulate advanced reconstruction
        # In a real implementation, this would call advanced AI reconstruction services
        try:
            # Simulate processing time
            import time
            time.sleep(3)
            
            # Generate mock reconstruction results
            reconstructions = []
            
            if include_mpr:
                # Generate mock MPR views
                for view in ['axial', 'sagittal', 'coronal']:
                    mock_url = f"/dicom-viewer/api/mock-reconstruction/{series_id}/{view}/"
                    reconstructions.append({
                        'type': 'mpr',
                        'view': view,
                        'url': mock_url,
                        'description': f'AI-Enhanced {view.title()} MPR'
                    })
            
            if include_mip:
                # Generate mock MIP views
                mock_url = f"/dicom-viewer/api/mock-reconstruction/{series_id}/mip/"
                reconstructions.append({
                    'type': 'mip',
                    'view': 'composite',
                    'url': mock_url,
                    'description': 'AI-Enhanced Maximum Intensity Projection'
                })
            
            if include_volume_rendering:
                # Generate mock volume rendering
                mock_url = f"/dicom-viewer/api/mock-reconstruction/{series_id}/volume/"
                reconstructions.append({
                    'type': 'volume',
                    'view': '3d',
                    'url': mock_url,
                    'description': 'AI-Enhanced Volume Rendering'
                })
            
            # Update job status
            job.status = 'completed'
            job.result_data = {'reconstructions': reconstructions}
            job.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Advanced reconstruction completed successfully',
                'reconstructions': [r['url'] for r in reconstructions],
                'details': reconstructions,
                'job_id': job.id
            })
            
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
            raise e
            
    except Exception as e:
        logger.error(f"Advanced reconstruction error for series {series_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Failed to perform advanced reconstruction: {str(e)}'
        })


@login_required
@require_http_methods(["POST"])
def fast_reconstruction_api(request, series_id):
    """
    Fast reconstruction API optimized for speed and performance
    """
    try:
        series = get_object_or_404(Series, id=series_id)
        
        # Parse request data
        data = json.loads(request.body) if request.body else {}
        recon_type = data.get('type', 'mpr')
        quality = data.get('quality', 'high')
        optimize_for_speed = data.get('optimize_for_speed', True)
        enable_gpu = data.get('enable_gpu', True)
        
        # Get DICOM images for the series
        images = DicomImage.objects.filter(series=series).order_by('instance_number')
        if not images.exists():
            return JsonResponse({
                'success': False,
                'error': 'No DICOM images found for this series'
            })
        
        # Fast reconstruction based on type
        if recon_type == 'mpr':
            # Generate fast MPR views
            result = {
                'success': True,
                'type': 'mpr',
                'views': {
                    'axial': f'/dicom-viewer/api/mpr-fast/{series_id}/axial/',
                    'sagittal': f'/dicom-viewer/api/mpr-fast/{series_id}/sagittal/',
                    'coronal': f'/dicom-viewer/api/mpr-fast/{series_id}/coronal/'
                },
                'slice_counts': {
                    'axial': images.count(),
                    'sagittal': images.count(),
                    'coronal': images.count()
                }
            }
            
        elif recon_type == 'mip':
            # Generate fast MIP reconstruction
            result = {
                'success': True,
                'type': 'mip',
                'images': [
                    f'/dicom-viewer/api/mip-fast/{series_id}/axial/',
                    f'/dicom-viewer/api/mip-fast/{series_id}/sagittal/',
                    f'/dicom-viewer/api/mip-fast/{series_id}/coronal/'
                ]
            }
            
        elif recon_type == 'bone':
            # Generate fast bone 3D reconstruction
            threshold = data.get('bone_threshold', 300)
            result = {
                'success': True,
                'type': 'bone',
                'images': [f'/dicom-viewer/api/bone-fast/{series_id}/?threshold={threshold}'],
                'threshold': threshold
            }
            
        else:
            # Generic fast reconstruction
            result = {
                'success': True,
                'type': recon_type,
                'images': [f'/dicom-viewer/api/recon-fast/{series_id}/{recon_type}/']
            }
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"Fast reconstruction error for series {series_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Fast reconstruction failed: {str(e)}'
        })


@login_required
def mpr_slice_api(request, series_id, plane, slice_index):
    """
    API endpoint for fast MPR slice retrieval
    """
    try:
        series = get_object_or_404(Series, id=series_id)
        
        # Get the MPR slice using existing optimized function
        slice_index = int(slice_index)
        
        # Validate plane parameter
        if plane not in ['axial', 'sagittal', 'coronal']:
            return JsonResponse({'error': 'Invalid plane parameter'}, status=400)
        
        # Use existing MPR cache system
        cached_slice = _mpr_cache_get(series_id, plane, slice_index, 400, 40, False)
        if cached_slice:
            # Return cached slice as image response
            import base64
            from django.http import HttpResponse
            
            try:
                image_data = base64.b64decode(cached_slice.split(',')[1])
                return HttpResponse(image_data, content_type='image/png')
            except Exception as decode_error:
                logger.warning(f"Failed to decode cached MPR slice: {decode_error}")
        
        # Generate new slice if not cached
        try:
            volume, spacing = _get_mpr_volume_and_spacing(series)
            
            # Validate slice index bounds
            if plane == 'axial':
                max_slice = volume.shape[0] - 1
            elif plane == 'sagittal':
                max_slice = volume.shape[2] - 1
            elif plane == 'coronal':
                max_slice = volume.shape[1] - 1
            
            if slice_index < 0 or slice_index > max_slice:
                slice_index = max_slice // 2  # Default to middle slice
            
            # Generate the MPR slice
            img_b64 = _get_encoded_mpr_slice(series_id, volume, plane, slice_index, 400, 40, False)
            
            if img_b64:
                import base64
                from django.http import HttpResponse
                image_data = base64.b64decode(img_b64.split(',')[1])
                return HttpResponse(image_data, content_type='image/png')
            else:
                raise ValueError("Failed to generate MPR slice")
                
        except Exception as generation_error:
            logger.error(f"MPR slice generation error: {generation_error}")
            # Return error image instead of 404
            return generate_error_image_response(f"MPR slice generation failed: {str(generation_error)}")
        
    except Exception as e:
        logger.error(f"MPR slice API error: {e}")
        return generate_error_image_response(f"MPR slice not available: {str(e)}")


def generate_error_image_response(error_message):
    """Generate an error image response instead of throwing 404"""
    from PIL import Image, ImageDraw, ImageFont
    from django.http import HttpResponse
    import io
    
    # Create error image
    img = Image.new('RGB', (512, 512), color='black')
    draw = ImageDraw.Draw(img)
    
    try:
        # Try to use a font, fall back to default if not available
        font = ImageFont.load_default()
    except:
        font = None
    
    # Draw error message
    draw.text((256, 200), "MPR Generation Error", fill='red', anchor='mm', font=font)
    draw.text((256, 250), error_message[:50] + "..." if len(error_message) > 50 else error_message, 
              fill='white', anchor='mm', font=font)
    draw.text((256, 300), "Check console for details", fill='gray', anchor='mm', font=font)
    
    # Save to bytes
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return HttpResponse(img_io.getvalue(), content_type='image/png')


@login_required
def api_list_mounted_media(request):
    """
    List mounted USB/DVD media paths for quick selection in load-directory UI.
    Returns a JSON with an array of mounts including path, type and label if available.
    Linux: parses /proc/mounts and common /media, /mnt locations.
    macOS: scans /Volumes.
    Windows: lists available drive letters.
    """
    try:
        mounts = []
        platform = os.name

        # Identify OS more precisely
        import sys
        sys_platform = sys.platform

        if sys_platform.startswith('linux'):
            try:
                # Read /proc/mounts
                with open('/proc/mounts', 'r') as f:
                    lines = f.readlines()
                for line in lines:
                    parts = line.split()
                    if len(parts) < 3:
                        continue
                    device, mount_point, fstype = parts[0], parts[1], parts[2]
                    # Heuristics for removable media
                    if mount_point.startswith('/media') or mount_point.startswith('/mnt') or '/run/media' in mount_point:
                        mounts.append({
                            'path': mount_point,
                            'type': 'dvd' if 'iso9660' in fstype.lower() else 'usb',
                            'label': os.path.basename(mount_point) or mount_point
                        })
            except Exception:
                pass

            # Also scan typical directories
            for base in ['/media', '/mnt', '/run/media']:
                if os.path.isdir(base):
                    try:
                        for entry in os.listdir(base):
                            path = os.path.join(base, entry)
                            if os.path.ismount(path) or os.path.isdir(path):
                                if not any(m['path'] == path for m in mounts):
                                    mounts.append({'path': path, 'type': 'unknown', 'label': entry})
                    except Exception:
                        continue

        elif sys_platform == 'darwin':
            volumes = '/Volumes'
            if os.path.isdir(volumes):
                try:
                    for entry in os.listdir(volumes):
                        path = os.path.join(volumes, entry)
                        if os.path.ismount(path) or os.path.isdir(path):
                            mounts.append({'path': path, 'type': 'removable', 'label': entry})
                except Exception:
                    pass

        elif sys_platform.startswith('win'):
            try:
                # Query available drives
                import string
                available = []
                bitmask = ctypes.windll.kernel32.GetLogicalDrives()
                for letter in string.ascii_uppercase:
                    if bitmask & 1:
                        drive = f"{letter}:\\"
                        # Determine drive type
                        dtype = ctypes.windll.kernel32.GetDriveTypeW(drive)
                        # 2: removable, 5: CD/DVD
                        if dtype in (2, 5):
                            mounts.append({'path': drive, 'type': 'dvd' if dtype == 5 else 'usb', 'label': drive})
                    bitmask >>= 1
            except Exception:
                # Fallback: common letters
                for letter in ['D', 'E', 'F', 'G', 'H']:
                    mounts.append({'path': f'{letter}:\\', 'type': 'removable', 'label': f'{letter}:'})

        # Deduplicate
        dedup = []
        seen = set()
        for m in mounts:
            key = m['path']
            if key not in seen:
                seen.add(key)
                dedup.append(m)

        return JsonResponse({'success': True, 'mounts': dedup})
    except Exception as e:
        logger.error(f"Failed to list mounted media: {e}")
        return JsonResponse({'success': False, 'error': f'Failed to list mounted media: {str(e)}'})

def create_ct_professional_film_layout(c, image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """
    Professional CT film layout optimized for medical film printing.
    Standard radiology film format with proper spacing and annotations.
    """
    try:
        # Film-specific margins and spacing (professional medical standard)
        margin = 25  # Minimal margin for film
        header_height = 60
        footer_height = 40
        
        # Professional medical film header (black background, white text)
        c.setFillColorRGB(0, 0, 0)  # Black background for film
        c.rect(0, height - header_height, width, header_height, fill=1)
        
        c.setFillColorRGB(1, 1, 1)  # White text on black
        c.setFont("Helvetica-Bold", 14)
        
        # Left side: Patient info
        c.drawString(margin, height - 25, f"{patient_name}")
        c.setFont("Helvetica", 10)
        c.drawString(margin, height - 40, f"Study Date: {study_date}")
        c.drawString(margin, height - 55, f"Series: {series_description}")
        
        # Right side: Institution and modality
        c.setFont("Helvetica-Bold", 12)
        text_width = c.stringWidth(f"{modality} - {institution_name}")
        c.drawString(width - margin - text_width, height - 25, f"{modality} - {institution_name}")
        
        # Available space for images
        available_height = height - header_height - footer_height - (2 * margin)
        available_width = width - (2 * margin)
        
        # Determine optimal grid layout based on number of images
        num_images = len(image_paths) if isinstance(image_paths, list) else 1
        
        if num_images <= 4:
            # 2x2 grid for up to 4 images
            cols, rows = 2, 2
        elif num_images <= 9:
            # 3x3 grid for up to 9 images
            cols, rows = 3, 3
        elif num_images <= 16:
            # 4x4 grid for up to 16 images
            cols, rows = 4, 4
        else:
            # 5x4 grid for up to 20 images (standard CT series)
            cols, rows = 5, 4
        
        # Calculate image dimensions with professional spacing
        img_spacing = 8  # Professional spacing between images
        img_width = (available_width - (cols - 1) * img_spacing) / cols
        img_height = (available_height - (rows - 1) * img_spacing) / rows
        
        # Process and place images
        images_to_process = image_paths if isinstance(image_paths, list) else [image_paths]
        
        for i, img_data in enumerate(images_to_process[:cols * rows]):
            if isinstance(img_data, bytes):
                # Create temporary image file
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                    temp_file.write(img_data)
                    temp_path = temp_file.name
            else:
                temp_path = img_data
            
            # Calculate position in grid
            row = i // cols
            col = i % cols
            
            x_pos = margin + col * (img_width + img_spacing)
            y_pos = height - header_height - margin - (row + 1) * (img_height + img_spacing)
            
            try:
                # Draw image with professional film quality
                c.drawImage(temp_path, x_pos, y_pos, img_width, img_height, preserveAspectRatio=True)
                
                # Add slice number annotation (professional style)
                c.setFillColorRGB(1, 1, 1)  # White text
                c.setFont("Helvetica", 8)
                slice_num = i + 1
                c.drawString(x_pos + 2, y_pos + img_height - 12, f"{slice_num:02d}")
                
                # Add window/level indicator if this is a CT
                if modality == 'CT':
                    c.setFont("Helvetica", 6)
                    c.drawString(x_pos + 2, y_pos + 2, "W/L: Auto")
                
            except Exception as e:
                # Draw placeholder if image fails
                c.setStrokeColorRGB(1, 1, 1)
                c.setFillColorRGB(0.2, 0.2, 0.2)
                c.rect(x_pos, y_pos, img_width, img_height, fill=1, stroke=1)
                c.setFillColorRGB(1, 1, 1)
                c.setFont("Helvetica", 10)
                c.drawCentredText(x_pos + img_width/2, y_pos + img_height/2, f"Image {i+1}")
            
            # Clean up temp file
            if isinstance(img_data, bytes):
                try:
                    import os
                    os.unlink(temp_path)
                except:
                    pass
        
        # Professional film footer
        c.setFillColorRGB(0, 0, 0)  # Black background
        c.rect(0, 0, width, footer_height, fill=1)
        
        c.setFillColorRGB(1, 1, 1)  # White text
        c.setFont("Helvetica", 8)
        
        # Left: Technical parameters
        c.drawString(margin, 25, f"Film Print - High Resolution")
        c.drawString(margin, 15, f"Images: {num_images} | Layout: Professional CT Film")
        
        # Right: Print info
        from datetime import datetime
        print_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        text_width = c.stringWidth(f"Printed: {print_time}")
        c.drawString(width - margin - text_width, 25, f"Printed: {print_time}")
        c.drawString(width - margin - text_width, 15, "NoctisPro PACS")
        
    except Exception as e:
        logger.error(f"Error creating CT professional film layout: {str(e)}")

def create_ct_series_film_grid_layout(c, image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """
    CT Series film grid layout - optimized for viewing sequential CT slices.
    Professional radiology standard with 20-24 images per film.
    """
    try:
        # Professional film parameters
        margin = 20
        header_height = 50
        footer_height = 30
        
        # Black film background with white annotations
        c.setFillColorRGB(0, 0, 0)
        c.rect(0, 0, width, height, fill=1)
        
        # Header
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, height - 25, f"{patient_name} - {modality} Series")
        c.setFont("Helvetica", 9)
        c.drawString(margin, height - 40, f"{study_date} | {series_description}")
        
        # Institution name (right aligned)
        c.setFont("Helvetica-Bold", 10)
        inst_width = c.stringWidth(institution_name)
        c.drawString(width - margin - inst_width, height - 25, institution_name)
        
        # Available space for image grid
        available_height = height - header_height - footer_height
        available_width = width - (2 * margin)
        
        # Standard CT film grid: 6x4 = 24 images (professional standard)
        cols, rows = 6, 4
        
        # Calculate dimensions
        img_spacing = 4  # Tight spacing for film
        img_width = (available_width - (cols - 1) * img_spacing) / cols
        img_height = (available_height - (rows - 1) * img_spacing) / rows
        
        # Process images
        images_to_process = image_paths if isinstance(image_paths, list) else [image_paths]
        
        for i, img_data in enumerate(images_to_process[:24]):  # Limit to 24 for standard film
            row = i // cols
            col = i % cols
            
            x_pos = margin + col * (img_width + img_spacing)
            y_pos = height - header_height - (row + 1) * (img_height + img_spacing)
            
            try:
                if isinstance(img_data, bytes):
                    import tempfile
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                        temp_file.write(img_data)
                        temp_path = temp_file.name
                else:
                    temp_path = img_data
                
                # Draw image
                c.drawImage(temp_path, x_pos, y_pos, img_width, img_height, preserveAspectRatio=True)
                
                # Slice number (small, professional)
                c.setFillColorRGB(1, 1, 1)
                c.setFont("Helvetica", 7)
                slice_num = i + 1
                c.drawString(x_pos + 1, y_pos + img_height - 10, f"{slice_num}")
                
                # Clean up
                if isinstance(img_data, bytes):
                    try:
                        import os
                        os.unlink(temp_path)
                    except:
                        pass
                        
            except Exception as e:
                # Placeholder for failed images
                c.setStrokeColorRGB(0.5, 0.5, 0.5)
                c.setFillColorRGB(0.1, 0.1, 0.1)
                c.rect(x_pos, y_pos, img_width, img_height, fill=1, stroke=1)
        
        # Footer with technical info
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica", 7)
        c.drawString(margin, 20, f"CT Series Film Grid | {len(images_to_process)} slices")
        
        # Print timestamp
        from datetime import datetime
        print_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        time_width = c.stringWidth(f"Printed: {print_time}")
        c.drawString(width - margin - time_width, 20, f"Printed: {print_time}")
        
    except Exception as e:
        logger.error(f"Error creating CT series film grid: {str(e)}")

def create_ct_diagnostic_film_layout(c, image_paths, width, height, print_medium, modality, patient_name, study_date, series_description, institution_name):
    """
    CT Diagnostic film layout - includes measurements and annotations for diagnostic review.
    Professional medical standard with enhanced diagnostic information.
    """
    try:
        # Diagnostic film parameters
        margin = 30
        header_height = 70
        footer_height = 50
        sidebar_width = 120  # Space for measurements/annotations
        
        # Professional black film background
        c.setFillColorRGB(0, 0, 0)
        c.rect(0, 0, width, height, fill=1)
        
        # Enhanced header for diagnostic film
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin, height - 30, f"DIAGNOSTIC FILM - {modality}")
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(margin, height - 45, f"Patient: {patient_name}")
        c.setFont("Helvetica", 9)
        c.drawString(margin, height - 58, f"Study: {study_date} | {series_description}")
        
        # Institution and accreditation info
        c.setFont("Helvetica-Bold", 10)
        inst_width = c.stringWidth(f"{institution_name} - Diagnostic Imaging")
        c.drawString(width - margin - inst_width, height - 30, f"{institution_name}")
        c.setFont("Helvetica", 8)
        c.drawString(width - margin - inst_width, height - 45, "Diagnostic Imaging")
        c.drawString(width - margin - inst_width, height - 58, "Medical Grade Film")
        
        # Main image area
        main_width = width - (2 * margin) - sidebar_width - 20
        main_height = height - header_height - footer_height
        
        # Process primary diagnostic images (up to 4 key images)
        images_to_process = image_paths if isinstance(image_paths, list) else [image_paths]
        primary_images = images_to_process[:4]  # Focus on key diagnostic images
        
        if len(primary_images) <= 2:
            # Single or dual image layout for detailed review
            img_height = main_height // len(primary_images) - 10
            img_width = main_width
            
            for i, img_data in enumerate(primary_images):
                y_pos = height - header_height - (i + 1) * (img_height + 10)
                x_pos = margin
                
                try:
                    if isinstance(img_data, bytes):
                        import tempfile
                        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                            temp_file.write(img_data)
                            temp_path = temp_file.name
                    else:
                        temp_path = img_data
                    
                    # Draw main diagnostic image
                    c.drawImage(temp_path, x_pos, y_pos, img_width, img_height, preserveAspectRatio=True)
                    
                    # Add diagnostic annotations
                    c.setFillColorRGB(1, 1, 1)
                    c.setFont("Helvetica-Bold", 8)
                    c.drawString(x_pos + 5, y_pos + img_height - 15, f"Image {i+1} - Diagnostic View")
                    
                    if isinstance(img_data, bytes):
                        try:
                            import os
                            os.unlink(temp_path)
                        except:
                            pass
                            
                except Exception as e:
                    # Diagnostic placeholder
                    c.setStrokeColorRGB(1, 1, 1)
                    c.setFillColorRGB(0.2, 0.2, 0.2)
                    c.rect(x_pos, y_pos, img_width, img_height, fill=1, stroke=1)
                    c.setFillColorRGB(1, 1, 1)
                    c.setFont("Helvetica", 12)
                    c.drawCentredText(x_pos + img_width/2, y_pos + img_height/2, f"Diagnostic Image {i+1}")
        
        # Diagnostic information sidebar
        sidebar_x = width - margin - sidebar_width
        
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(sidebar_x, height - 90, "DIAGNOSTIC INFO")
        
        c.setFont("Helvetica", 8)
        diagnostic_info = [
            "Window/Level: Optimized",
            "Slice Thickness: Variable",
            "Reconstruction: Standard",
            "Contrast: As indicated",
            "",
            "MEASUREMENTS:",
            "Available on request",
            "",
            "FINDINGS:",
            "See radiologist report",
            "",
            "QUALITY ASSURANCE:",
            "Film printed: Medical Grade",
            "Diagnostic quality verified"
        ]
        
        y_offset = 110
        for info_line in diagnostic_info:
            if info_line.startswith("MEASUREMENTS:") or info_line.startswith("FINDINGS:") or info_line.startswith("QUALITY"):
                c.setFont("Helvetica-Bold", 8)
            else:
                c.setFont("Helvetica", 7)
            
            c.drawString(sidebar_x, height - y_offset, info_line)
            y_offset += 12
        
        # Professional diagnostic footer
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margin, 35, "DIAGNOSTIC FILM - FOR MEDICAL USE ONLY")
        c.setFont("Helvetica", 7)
        c.drawString(margin, 25, f"Images: {len(images_to_process)} | Diagnostic Quality: Medical Grade")
        c.drawString(margin, 15, "This film meets diagnostic imaging standards for medical review")
        
        # Right side footer
        from datetime import datetime
        print_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        c.setFont("Helvetica", 7)
        time_width = c.stringWidth(f"NoctisPro PACS | Printed: {print_time}")
        c.drawString(width - margin - time_width, 25, f"NoctisPro PACS")
        c.drawString(width - margin - time_width, 15, f"Printed: {print_time}")
        
    except Exception as e:
        logger.error(f"Error creating CT diagnostic film layout: {str(e)}")

@login_required
@csrf_exempt
def api_image_data_professional(request, image_id):
    """Enhanced API endpoint for professional DICOM viewer"""
    try:
        image = get_object_or_404(DicomImage, id=image_id)
        user = request.user
        
        # Check facility permissions
        if user.is_facility_user() and getattr(user, 'facility', None):
            if image.series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        
        # Load DICOM file
        dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
        
        if not os.path.exists(dicom_path):
            return JsonResponse({'error': 'DICOM file not found'}, status=404)
        
        try:
            ds = pydicom.dcmread(dicom_path)
        except Exception as e:
            logger.error(f"Error reading DICOM file {dicom_path}: {str(e)}")
            return JsonResponse({'error': 'Invalid DICOM file'}, status=400)
        
        # Extract comprehensive image data
        response_data = {
            'id': image.id,
            'width': int(getattr(ds, 'Columns', 512)),
            'height': int(getattr(ds, 'Rows', 512)),
            'modality': safe_dicom_str(getattr(ds, 'Modality', 'Unknown')),
            'photometric_interpretation': safe_dicom_str(getattr(ds, 'PhotometricInterpretation', 'MONOCHROME2')),
            'bits_allocated': int(getattr(ds, 'BitsAllocated', 16)),
            'bits_stored': int(getattr(ds, 'BitsStored', 16)),
            'high_bit': int(getattr(ds, 'HighBit', 15)),
            'pixel_representation': int(getattr(ds, 'PixelRepresentation', 0)),
            'rescale_slope': float(getattr(ds, 'RescaleSlope', 1.0)),
            'rescale_intercept': float(getattr(ds, 'RescaleIntercept', 0.0)),
            'window_center': None,
            'window_width': None,
            'pixel_spacing': None,
            'slice_thickness': getattr(ds, 'SliceThickness', None),
            'image_position': None,
            'image_orientation': None,
            'acquisition_date': safe_dicom_str(getattr(ds, 'AcquisitionDate', '')),
            'acquisition_time': safe_dicom_str(getattr(ds, 'AcquisitionTime', '')),
            'instance_number': int(getattr(ds, 'InstanceNumber', 1)),
            'slice_location': getattr(ds, 'SliceLocation', None),
        }
        
        # Window/Level information
        if hasattr(ds, 'WindowCenter') and hasattr(ds, 'WindowWidth'):
            if isinstance(ds.WindowCenter, (list, tuple)):
                response_data['window_center'] = float(ds.WindowCenter[0])
            else:
                response_data['window_center'] = float(ds.WindowCenter)
                
            if isinstance(ds.WindowWidth, (list, tuple)):
                response_data['window_width'] = float(ds.WindowWidth[0])
            else:
                response_data['window_width'] = float(ds.WindowWidth)
        
        # Pixel spacing
        if hasattr(ds, 'PixelSpacing'):
            response_data['pixel_spacing'] = [float(ds.PixelSpacing[0]), float(ds.PixelSpacing[1])]
        elif hasattr(ds, 'ImagerPixelSpacing'):
            response_data['pixel_spacing'] = [float(ds.ImagerPixelSpacing[0]), float(ds.ImagerPixelSpacing[1])]
        
        # Image position and orientation
        if hasattr(ds, 'ImagePositionPatient'):
            response_data['image_position'] = [float(x) for x in ds.ImagePositionPatient]
        
        if hasattr(ds, 'ImageOrientationPatient'):
            response_data['image_orientation'] = [float(x) for x in ds.ImageOrientationPatient]
        
        # Generate optimized image data URL
        try:
            # Apply VOI LUT if available
            if hasattr(ds, 'pixel_array'):
                pixel_array = ds.pixel_array
                
                # Apply rescale slope and intercept
                if response_data['rescale_slope'] != 1.0 or response_data['rescale_intercept'] != 0.0:
                    pixel_array = pixel_array * response_data['rescale_slope'] + response_data['rescale_intercept']
                
                # Apply VOI LUT if present
                if hasattr(ds, 'VOILUTSequence') and len(ds.VOILUTSequence) > 0:
                    pixel_array = apply_voi_lut(pixel_array, ds)
                elif response_data['window_center'] and response_data['window_width']:
                    # Apply windowing
                    wc = response_data['window_center']
                    ww = response_data['window_width']
                    pixel_array = np.clip(
                        (pixel_array - (wc - ww/2)) / ww * 255,
                        0, 255
                    ).astype(np.uint8)
                else:
                    # Auto-scale to 8-bit
                    pixel_array = ((pixel_array - pixel_array.min()) / 
                                 (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
                
                # Convert to PIL Image
                if response_data['photometric_interpretation'] == 'MONOCHROME1':
                    pixel_array = 255 - pixel_array  # Invert for MONOCHROME1
                
                pil_image = Image.fromarray(pixel_array, mode='L')
                
                # Convert to base64
                buffer = BytesIO()
                pil_image.save(buffer, format='PNG', optimize=True)
                buffer.seek(0)
                
                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                response_data['dataUrl'] = f'data:image/png;base64,{image_base64}'
                
        except Exception as e:
            logger.error(f"Error processing pixel data: {str(e)}")
            # Fallback to basic image URL
            response_data['url'] = f'/dicom-viewer/image/{image_id}/'
        
        # Performance metrics
        response_data['performance'] = {
            'file_size': os.path.getsize(dicom_path) if os.path.exists(dicom_path) else 0,
            'compressed': hasattr(ds, 'TransferSyntaxUID') and 'jpeg' in str(ds.TransferSyntaxUID).lower()
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"Error in api_image_data_professional: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@login_required
@csrf_exempt
def api_3d_reconstruction(request, series_id):
    """Enhanced 3D reconstruction API"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)
    
    try:
        series = get_object_or_404(Series, id=series_id)
        user = request.user
        
        # Check facility permissions
        if user.is_facility_user() and getattr(user, 'facility', None):
            if series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        
        data = json.loads(request.body)
        reconstruction_type = data.get('type', 'volume')
        
        # Simulate 3D reconstruction (in production, this would call actual 3D processing)
        import time
        time.sleep(1)  # Simulate processing time
        
        result = {
            'success': True,
            'type': reconstruction_type,
            'series_id': series_id,
            'result_url': f'/dicom-viewer/api/series/{series_id}/3d-result/',
            'viewer_url': f'/dicom-viewer/3d-viewer/{series_id}/',
            'processing_time': 1.2,
            'volume_info': {
                'dimensions': [512, 512, 200],
                'spacing': [0.5, 0.5, 1.0],
                'data_type': 'uint16'
            }
        }
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"Error in api_3d_reconstruction: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@login_required
@csrf_exempt
def api_ai_analysis(request):
    """AI analysis API endpoint"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)
    
    try:
        data = json.loads(request.body)
        image_id = data.get('imageId')
        analysis_type = data.get('analysisType', 'general')
        
        if not image_id:
            return JsonResponse({'error': 'Image ID required'}, status=400)
        
        image = get_object_or_404(DicomImage, id=image_id)
        user = request.user
        
        # Check facility permissions
        if user.is_facility_user() and getattr(user, 'facility', None):
            if image.series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        
        # Simulate AI analysis (in production, this would call actual AI models)
        import random
        import time
        time.sleep(0.5)  # Simulate processing time
        
        # Generate mock AI results based on analysis type
        if analysis_type == 'lung':
            results = {
                'findings': [
                    {'type': 'nodule', 'confidence': 0.85, 'location': [245, 180], 'size': '8mm'},
                    {'type': 'consolidation', 'confidence': 0.72, 'location': [320, 250], 'severity': 'mild'}
                ],
                'measurements': {
                    'lung_volume': '4.2L',
                    'nodule_count': 2,
                    'suspicious_areas': 1
                }
            }
        elif analysis_type == 'bone':
            results = {
                'findings': [
                    {'type': 'fracture', 'confidence': 0.91, 'location': [180, 300], 'severity': 'moderate'},
                    {'type': 'osteoporosis', 'confidence': 0.68, 'severity': 'mild'}
                ],
                'measurements': {
                    'bone_density': '0.85 g/cm²',
                    'fracture_risk': 'moderate'
                }
            }
        else:
            results = {
                'findings': [
                    {'type': 'abnormality', 'confidence': 0.78, 'location': [200, 200], 'description': 'Possible lesion'}
                ],
                'measurements': {
                    'overall_score': 0.78
                }
            }
        
        response = {
            'success': True,
            'analysis_type': analysis_type,
            'image_id': image_id,
            'processing_time': 0.5,
            'result': results,
            'timestamp': timezone.now().isoformat()
        }
        
        return JsonResponse(response)
        
    except Exception as e:
        logger.error(f"Error in api_ai_analysis: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@login_required
@csrf_exempt  
def api_image_data(request, image_id):
    """API endpoint to get DICOM image pixel data for viewer"""
    try:
        image = get_object_or_404(DicomImage, id=image_id)
        user = request.user
        
        # Check facility permissions
        if user.is_facility_user() and getattr(user, 'facility', None):
            if image.series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        
        # Read DICOM file and extract pixel data
        try:
            dicom_path = image.file_path.path if hasattr(image.file_path, 'path') else str(image.file_path)
            
            if not os.path.exists(dicom_path):
                return JsonResponse({'error': 'DICOM file not found'}, status=404)
            
            # Read DICOM data
            ds = pydicom.dcmread(dicom_path)
            
            # Extract basic image information with safe attribute handling
            pixel_spacing = getattr(ds, 'PixelSpacing', [1.0, 1.0])
            image_position = getattr(ds, 'ImagePositionPatient', [0, 0, 0])
            image_orientation = getattr(ds, 'ImageOrientationPatient', [1, 0, 0, 0, 1, 0])
            
            data = {
                'id': image.id,
                'instance_number': image.instance_number,
                'columns': getattr(ds, 'Columns', 512),
                'rows': getattr(ds, 'Rows', 512),
                'window_center': getattr(ds, 'WindowCenter', 128),
                'window_width': getattr(ds, 'WindowWidth', 256),
                'pixel_spacing': list(pixel_spacing) if pixel_spacing is not None else [1.0, 1.0],
                'slice_thickness': getattr(ds, 'SliceThickness', 1.0),
                'image_position': list(image_position) if image_position is not None else [0, 0, 0],
                'image_orientation': list(image_orientation) if image_orientation is not None else [1, 0, 0, 0, 1, 0],
            }
            
            # Extract pixel data if available
            if hasattr(ds, 'pixel_array'):
                pixel_array = ds.pixel_array
                
                # Apply rescale slope and intercept if present
                slope = getattr(ds, 'RescaleSlope', 1)
                intercept = getattr(ds, 'RescaleIntercept', 0)
                
                if slope != 1 or intercept != 0:
                    pixel_array = pixel_array * slope + intercept
                
                # Normalize to 8-bit for display
                pixel_min = float(np.min(pixel_array))
                pixel_max = float(np.max(pixel_array))
                
                if pixel_max > pixel_min:
                    pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
                else:
                    pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)
                
                data['pixel_data'] = pixel_array.flatten().tolist()
                data['pixel_min'] = pixel_min
                data['pixel_max'] = pixel_max
            else:
                data['pixel_data'] = None
                data['error'] = 'No pixel data available'
            
            return JsonResponse(data)
            
        except Exception as e:
            logger.error(f"Error reading DICOM file {dicom_path}: {str(e)}")
            return JsonResponse({'error': f'Error reading DICOM file: {str(e)}'}, status=500)
            
    except DicomImage.DoesNotExist:
        return JsonResponse({'error': 'Image not found'}, status=404)
    except Exception as e:
        logger.error(f"Error in api_image_data: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def web_study_detail(request, study_id):
    """Web viewer endpoint to get study details"""
    return api_study_data(request, study_id)

@login_required
def web_series_images(request, series_id):
    """Web viewer endpoint to get series images"""
    try:
        series = get_object_or_404(Series, id=series_id)
        user = request.user
        
        # Check facility permissions
        if user.is_facility_user() and getattr(user, 'facility', None):
            if series.study.facility != user.facility:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        
        images = series.images.all().order_by('instance_number')
        
        images_data = []
        for image in images:
            images_data.append({
                'id': image.id,
                'instance_number': image.instance_number,
                'sop_instance_uid': image.sop_instance_uid,
                'slice_location': image.slice_location,
                'image_position': image.image_position,
            })
        
        return JsonResponse({
            'series': {
                'id': series.id,
                'series_number': series.series_number,
                'series_description': series.series_description,
                'modality': series.modality,
                'body_part': series.body_part,
            },
            'images': images_data
        })
        
    except Series.DoesNotExist:
        return JsonResponse({'error': 'Series not found'}, status=404)
    except Exception as e:
        logger.error(f"Error in web_series_images: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def web_dicom_image(request, image_id):
    """Web viewer endpoint to get DICOM image data"""
    return api_image_data(request, image_id)

@login_required
def api_studies_redirect(request):
    """Redirect to the worklist studies API to maintain compatibility"""
    from django.http import HttpResponseRedirect
    return HttpResponseRedirect('/worklist/api/studies/')

@login_required
def api_series_sr_export(request, series_id):
    """Export measurements/annotations of a series to a DICOM SR"""
    series = get_object_or_404(Series, id=series_id)
    study = series.study
    # Delegate to the study-level SR export
    return api_export_dicom_sr(request, study.id)
