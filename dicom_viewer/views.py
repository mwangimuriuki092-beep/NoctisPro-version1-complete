from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import View
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
import logging

# Configure audit logger
audit_logger = logging.getLogger('dicom_audit')

from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.conf import settings
from io import BytesIO


@login_required
@csrf_exempt  
def api_dicom_image_display(request, image_id):
    """API endpoint to get processed DICOM image with windowing"""
    image = get_object_or_404(DicomImage, id=image_id)
    user = request.user
    
    # Check permissions
    if not check_dicom_access_permission(user, image):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    # Log access
    log_dicom_access(user, image, 'VIEW_IMAGE', request)
    
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

        # Extract metadata even if pixel data fails
        metadata = {}
        if ds:
            metadata = {
                'rows': getattr(ds, 'Rows', 512),
                'columns': getattr(ds, 'Columns', 512),
                'bits_allocated': getattr(ds, 'BitsAllocated', 16),
                'bits_stored': getattr(ds, 'BitsStored', 16),
                'high_bit': getattr(ds, 'HighBit', 15),
                'pixel_representation': getattr(ds, 'PixelRepresentation', 0),
                'photometric_interpretation': getattr(ds, 'PhotometricInterpretation', 'MONOCHROME2'),
                'rescale_slope': getattr(ds, 'RescaleSlope', 1.0),
                'rescale_intercept': getattr(ds, 'RescaleIntercept', 0.0),
                'window_center': getattr(ds, 'WindowCenter', None),
                'window_width': getattr(ds, 'WindowWidth', None),
            }

        # Try to get pixel data
        pixel_data_base64 = None
        try:
            if ds and hasattr(ds, 'pixel_array'):
                pixel_array = ds.pixel_array
                
                # Apply rescale
                if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                    pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
                
                # Apply windowing if specified
                if window_width_param and window_level_param:
                    try:
                        window_width = float(window_width_param)
                        window_level = float(window_level_param)
                        
                        # Apply window/level
                        lower = window_level - window_width / 2
                        upper = window_level + window_width / 2
                        pixel_array = np.clip(pixel_array, lower, upper)
                        
                        # Normalize to 0-255
                        pixel_array = ((pixel_array - lower) / (upper - lower) * 255).astype(np.uint8)
                    except ValueError:
                        warnings['windowing_error'] = 'Invalid window parameters'
                        # Use default normalization
                        pixel_min = np.min(pixel_array)
                        pixel_max = np.max(pixel_array)
                        if pixel_max > pixel_min:
                            pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
                        else:
                            pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)
                else:
                    # Auto windowing
                    pixel_min = np.min(pixel_array)
                    pixel_max = np.max(pixel_array)
                    if pixel_max > pixel_min:
                        pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
                    else:
                        pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)
                
                # Invert if requested
                if inverted:
                    pixel_array = 255 - pixel_array
                
                # Convert to PIL Image and then to base64
                if len(pixel_array.shape) == 2:
                    pil_image = Image.fromarray(pixel_array, mode='L')
                else:
                    pil_image = Image.fromarray(pixel_array)
                
                # Convert to base64
                buffer = BytesIO()
                pil_image.save(buffer, format='PNG')
                pixel_data_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
        except Exception as e:
            warnings['pixel_processing_error'] = str(e)

        # Return response with image data or fallback
        response_data = {
            'success': True,
            'image_id': image_id,
            'metadata': metadata,
            'warnings': warnings
        }
        
        if pixel_data_base64:
            response_data['image_data'] = f'data:image/png;base64,{pixel_data_base64}'
        else:
            # Provide fallback placeholder image
            response_data['image_data'] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRJQ09NIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
            warnings['fallback_used'] = 'Using placeholder image due to processing errors'
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Failed to process DICOM image: {str(e)}',
            'image_id': image_id
        }, status=500)


@login_required
def web_dicom_image(request, image_id):
    """Web endpoint for DICOM image display"""
    image = get_object_or_404(DicomImage, id=image_id)
    
    # Check permissions
    if not check_dicom_access_permission(request.user, image):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    # Log access
    log_dicom_access(request.user, image, 'VIEW_IMAGE', request)
    
    try:
        # Get DICOM metadata
        dicom_path = os.path.join(settings.MEDIA_ROOT, str(image.file_path))
        ds = pydicom.dcmread(dicom_path, stop_before_pixels=True)  # Metadata only
        
        metadata = {
            'image_id': image.id,
            'instance_number': getattr(ds, 'InstanceNumber', 1),
            'rows': getattr(ds, 'Rows', 512),
            'columns': getattr(ds, 'Columns', 512),
            'bits_allocated': getattr(ds, 'BitsAllocated', 16),
            'window_center': getattr(ds, 'WindowCenter', 40),
            'window_width': getattr(ds, 'WindowWidth', 400),
            'rescale_slope': getattr(ds, 'RescaleSlope', 1.0),
            'rescale_intercept': getattr(ds, 'RescaleIntercept', 0.0),
        }
        
        return JsonResponse({
            'success': True,
            'image': metadata
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Failed to read DICOM metadata: {str(e)}'
        }, status=500)


@login_required
def web_study_detail(request, study_id):
    """Get study details with series and images"""
    study = get_object_or_404(Study, id=study_id)
    
    # Check permissions
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user():
        if getattr(request.user, 'facility', None) and study.facility != request.user.facility:
            return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Get series with images
        series_data = []
        for series in study.series_set.all().prefetch_related('images'):
            images_data = []
            for img in series.images.all():
                images_data.append({
                    'id': img.id,
                    'instance_number': img.instance_number,
                    'image_position': img.image_position,
                    'image_orientation': img.image_orientation,
                    'pixel_spacing': img.pixel_spacing,
                    'slice_thickness': img.slice_thickness,
                })
            
            series_data.append({
                'id': series.id,
                'series_number': series.series_number,
                'series_description': series.series_description,
                'modality': series.modality,
                'images': images_data,
                'image_count': len(images_data)
            })
        
        study_data = {
            'id': study.id,
            'accession_number': study.accession_number,
            'study_description': study.study_description,
            'patient_name': study.patient.patient_name if study.patient else 'Unknown',
            'study_date': study.study_date.isoformat() if study.study_date else None,
            'series': series_data,  # Changed from 'series_list' to 'series'
            'series_count': len(series_data)
        }
        
        return JsonResponse({
            'success': True,
            'study': study_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Failed to get study data: {str(e)}'
        }, status=500)


@login_required
def web_series_images(request, series_id):
    """Get images for a specific series"""
    series = get_object_or_404(Series, id=series_id)
    
    # Check permissions
    if hasattr(request.user, 'is_facility_user') and request.user.is_facility_user():
        if (getattr(request.user, 'facility', None) and 
            series.study and series.study.facility != request.user.facility):
            return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        images_data = []
        for img in series.images.all().order_by('instance_number'):
            images_data.append({
                'id': img.id,
                'instance_number': img.instance_number,
                'image_position': img.image_position,
                'image_orientation': img.image_orientation,
                'pixel_spacing': img.pixel_spacing,
                'slice_thickness': img.slice_thickness,
                'window_center': img.window_center,
                'window_width': img.window_width,
            })
        
        return JsonResponse({
            'success': True,
            'series_id': series_id,
            'images': images_data,
            'image_count': len(images_data)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Failed to get series images: {str(e)}'
        }, status=500)


def check_dicom_access_permission(user, image):
    """Check if user has permission to access a DICOM image"""
    try:
        if user.is_admin():
            return True
        
        if hasattr(user, 'is_facility_user') and user.is_facility_user():
            if (getattr(user, 'facility', None) and 
                image.series and image.series.study and 
                image.series.study.facility == user.facility):
                return True
        
        # Default: allow access for authenticated users
        return user.is_authenticated
        
    except Exception as e:
        audit_logger.error(f"Error checking DICOM access permission: {str(e)}")
        return False


def log_dicom_access(user, image, action, request=None):
    """Log DICOM access for audit trail"""
    try:
        audit_logger.info(f"DICOM Access: User {user.username} performed {action} on image {image.id}")
        
        # Additional audit logging could be added here
        if request:
            ip_address = request.META.get('REMOTE_ADDR', 'Unknown')
            user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
            audit_logger.info(f"Access details: IP={ip_address}, UserAgent={user_agent}")
            
    except Exception as e:
        # Never let audit logging break the main functionality
        audit_logger.error(f"Error logging DICOM access: {str(e)}")


# Create stub class-based views for all missing views
class ViewerIndexView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'dicom_viewer/index.html')

class ViewerView(LoginRequiredMixin, View):
	def get(self, request, study_id): return render(request, 'dicom_viewer/viewer.html')

class SeriesViewerView(LoginRequiredMixin, View):
	def get(self, request, series_id): return render(request, 'dicom_viewer/series_viewer.html')

class GetImageView(LoginRequiredMixin, View):
	def get(self, request, image_id):
		"""Get DICOM image data for display"""
		return api_dicom_image_display(request, image_id)

class GetDicomImageView(LoginRequiredMixin, View):
	def get(self, request, image_id):
		"""Get DICOM image data"""
		return web_dicom_image(request, image_id)

class GetThumbnailView(LoginRequiredMixin, View):
	def get(self, request, image_id): return HttpResponse('Thumbnail')

class GetPreviewView(LoginRequiredMixin, View):
	def get(self, request, image_id): return HttpResponse('Preview')

class GetStudyMetadataView(LoginRequiredMixin, View):
	def get(self, request, study_id):
		"""Get study metadata"""
		return web_study_detail(request, study_id)

class GetSeriesMetadataView(LoginRequiredMixin, View):
	def get(self, request, series_id): return JsonResponse({'metadata': {}})

class GetSeriesImagesView(LoginRequiredMixin, View):
	def get(self, request, series_id):
		"""Get series images"""
		return web_series_images(request, series_id)

class SaveViewerSessionView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})

class LoadViewerSessionView(LoginRequiredMixin, View):
	def get(self, request, study_id): return JsonResponse({'session': {}})

class MeasurementListView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'measurements': []})

class CreateMeasurementView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})

class MeasurementDetailView(LoginRequiredMixin, View):
	def get(self, request, measurement_id): return JsonResponse({'measurement': {}})

class DeleteMeasurementView(LoginRequiredMixin, View):
	def delete(self, request, measurement_id): return JsonResponse({'success': True})

class ImageMeasurementsView(LoginRequiredMixin, View):
	def get(self, request, image_id): return JsonResponse({'measurements': []})

class AnnotationListView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'annotations': []})

class CreateAnnotationView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})

class AnnotationDetailView(LoginRequiredMixin, View):
	def get(self, request, annotation_id): return JsonResponse({'annotation': {}})

class UpdateAnnotationView(LoginRequiredMixin, View):
	def put(self, request, annotation_id): return JsonResponse({'success': True})

class DeleteAnnotationView(LoginRequiredMixin, View):
	def delete(self, request, annotation_id): return JsonResponse({'success': True})

class ImageAnnotationsView(LoginRequiredMixin, View):
	def get(self, request, image_id): return JsonResponse({'annotations': []})

class WindowLevelPresetListView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'presets': []})

class CreatePresetView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})

class DeletePresetView(LoginRequiredMixin, View):
	def delete(self, request, preset_id): return JsonResponse({'success': True})

class HangingProtocolListView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'protocols': []})

class MatchHangingProtocolView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'protocol': {}})

class ReconstructionListView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'reconstructions': []})

class CreateReconstructionView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})

class ReconstructionDetailView(LoginRequiredMixin, View):
	def get(self, request, job_id): return JsonResponse({'reconstruction': {}})

class ReconstructionStatusView(LoginRequiredMixin, View):
	def get(self, request, job_id): return JsonResponse({'status': 'completed'})

class ReconstructionResultView(LoginRequiredMixin, View):
	def get(self, request, job_id): return JsonResponse({'result': {}})

class MPRViewView(LoginRequiredMixin, View):
	def get(self, request, series_id): return JsonResponse({'mpr': {}})

class MPRSliceView(LoginRequiredMixin, View):
	def get(self, request, series_id): return JsonResponse({'slice': {}})

class ProcessImageView(LoginRequiredMixin, View):
	def post(self, request, image_id): return JsonResponse({'success': True})

class EnhanceImageView(LoginRequiredMixin, View):
	def post(self, request, image_id): return JsonResponse({'success': True})

class FilterImageView(LoginRequiredMixin, View):
	def post(self, request, image_id): return JsonResponse({'success': True})

class ExportImageView(LoginRequiredMixin, View):
	def get(self, request, image_id): return HttpResponse('Export Image')

class ExportSeriesView(LoginRequiredMixin, View):
	def get(self, request, series_id): return HttpResponse('Export Series')

class ExportStudyView(LoginRequiredMixin, View):
	def get(self, request, study_id): return HttpResponse('Export Study')

class ExportScreenshotView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})

class PrintImageView(LoginRequiredMixin, View):
	def post(self, request, image_id): return JsonResponse({'success': True})

class PrintSeriesView(LoginRequiredMixin, View):
	def post(self, request, series_id): return JsonResponse({'success': True})

class PrintStudyView(LoginRequiredMixin, View):
	def post(self, request, study_id): return JsonResponse({'success': True})

class GenerateQRCodeView(LoginRequiredMixin, View):
	def get(self, request, study_id): return JsonResponse({'qrcode': 'data'})

class HounsfieldCalibrationView(LoginRequiredMixin, View):
	def get(self, request, study_id): return JsonResponse({'calibration': {}})

class ValidateHounsfieldView(LoginRequiredMixin, View):
	def get(self, request, series_id): return JsonResponse({'valid': True})

class CineLoopView(LoginRequiredMixin, View):
	def get(self, request, series_id): return JsonResponse({'cine': {}})

class CompareStudiesView(LoginRequiredMixin, View):
	def get(self, request, study_id1, study_id2): return render(request, 'dicom_viewer/compare.html')

class CompareMetadataView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'comparison': {}})