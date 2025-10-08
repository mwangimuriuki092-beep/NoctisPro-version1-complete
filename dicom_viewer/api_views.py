"""
REST API views for DICOM operations
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from django.conf import settings
from worklist.models import Study, Series, DicomImage, Patient
from .dicom_scp_client import dicom_scu_client
import os
import json
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_scp_connection(request):
    """Test connection to DICOM SCP server"""
    success, message = dicom_scu_client.verify_connection()
    
    if success:
        return Response({
            'status': 'success',
            'message': message
        })
    else:
        return Response({
            'status': 'error',
            'message': message
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_dicom(request):
    """Upload DICOM file via API"""
    if 'file' not in request.FILES:
        return Response({
            'status': 'error',
            'message': 'No file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    
    # Save temporarily
    temp_path = os.path.join(settings.MEDIA_ROOT, 'temp', file.name)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    with open(temp_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    
    # Send to DICOM SCP
    success, message = dicom_scu_client.send_dicom(temp_path)
    
    # Clean up temp file
    try:
        os.remove(temp_path)
    except:
        pass
    
    if success:
        return Response({
            'status': 'success',
            'message': message
        })
    else:
        return Response({
            'status': 'error',
            'message': message
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dicom_metadata(request, image_id):
    """Get detailed DICOM metadata"""
    image = get_object_or_404(DicomImage, id=image_id)
    
    if not os.path.exists(image.dicom_file.path):
        return Response({
            'status': 'error',
            'message': 'DICOM file not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    try:
        import pydicom
        ds = pydicom.dcmread(image.dicom_file.path, stop_before_pixels=False)
        
        # Extract important metadata
        metadata = {
            'patient': {
                'name': str(ds.get('PatientName', '')),
                'id': str(ds.get('PatientID', '')),
                'birth_date': str(ds.get('PatientBirthDate', '')),
                'sex': str(ds.get('PatientSex', '')),
                'age': str(ds.get('PatientAge', '')),
            },
            'study': {
                'instance_uid': str(ds.get('StudyInstanceUID', '')),
                'date': str(ds.get('StudyDate', '')),
                'time': str(ds.get('StudyTime', '')),
                'description': str(ds.get('StudyDescription', '')),
                'id': str(ds.get('StudyID', '')),
            },
            'series': {
                'instance_uid': str(ds.get('SeriesInstanceUID', '')),
                'number': str(ds.get('SeriesNumber', '')),
                'description': str(ds.get('SeriesDescription', '')),
                'modality': str(ds.get('Modality', '')),
            },
            'instance': {
                'sop_instance_uid': str(ds.get('SOPInstanceUID', '')),
                'sop_class_uid': str(ds.get('SOPClassUID', '')),
                'instance_number': str(ds.get('InstanceNumber', '')),
                'transfer_syntax': str(ds.file_meta.TransferSyntaxUID),
            },
            'image': {
                'rows': int(ds.get('Rows', 0)),
                'columns': int(ds.get('Columns', 0)),
                'bits_allocated': int(ds.get('BitsAllocated', 0)),
                'bits_stored': int(ds.get('BitsStored', 0)),
                'pixel_representation': int(ds.get('PixelRepresentation', 0)),
                'photometric_interpretation': str(ds.get('PhotometricInterpretation', '')),
                'samples_per_pixel': int(ds.get('SamplesPerPixel', 1)),
            },
            'acquisition': {
                'kvp': str(ds.get('KVP', '')),
                'exposure': str(ds.get('Exposure', '')),
                'exposure_time': str(ds.get('ExposureTime', '')),
                'xray_tube_current': str(ds.get('XRayTubeCurrent', '')),
            }
        }
        
        # Add window/level info if present
        if 'WindowCenter' in ds:
            metadata['display'] = {
                'window_center': str(ds.WindowCenter),
                'window_width': str(ds.WindowWidth),
            }
        
        return Response({
            'status': 'success',
            'metadata': metadata
        })
    except Exception as e:
        logger.error(f"Error reading DICOM metadata: {e}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dicom_file(request, image_id):
    """Download raw DICOM file"""
    image = get_object_or_404(DicomImage, id=image_id)
    
    if not os.path.exists(image.dicom_file.path):
        return Response({
            'status': 'error',
            'message': 'DICOM file not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    return FileResponse(
        open(image.dicom_file.path, 'rb'),
        as_attachment=True,
        filename=f'{image.sop_instance_uid}.dcm'
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_series_images(request, series_id):
    """Get all images for a series"""
    series = get_object_or_404(Series, id=series_id)
    images = series.images.all().order_by('instance_number')
    
    image_data = []
    for image in images:
        image_data.append({
            'id': str(image.id),
            'instance_number': image.instance_number,
            'sop_instance_uid': image.sop_instance_uid,
            'file_path': image.dicom_file.url if image.dicom_file else None,
            'thumbnail_url': f'/dicom/api/images/{image.id}/thumbnail/',
        })
    
    return Response({
        'status': 'success',
        'series': {
            'id': str(series.id),
            'series_instance_uid': series.series_instance_uid,
            'series_number': series.series_number,
            'series_description': series.series_description,
            'modality': series.modality,
            'image_count': images.count(),
        },
        'images': image_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_study_data(request, study_id):
    """Get complete study data with all series and images"""
    study = get_object_or_404(Study, id=study_id)
    series_list = study.series.all().order_by('series_number')
    
    series_data = []
    for series in series_list:
        images = series.images.all().order_by('instance_number')
        series_data.append({
            'id': str(series.id),
            'series_instance_uid': series.series_instance_uid,
            'series_number': series.series_number,
            'series_description': series.series_description,
            'modality': series.modality,
            'image_count': images.count(),
            'images': [{
                'id': str(img.id),
                'instance_number': img.instance_number,
                'sop_instance_uid': img.sop_instance_uid,
                'file_url': f'/dicom/api/images/{img.id}/file/',
            } for img in images]
        })
    
    return Response({
        'status': 'success',
        'study': {
            'id': str(study.id),
            'study_instance_uid': study.study_instance_uid,
            'study_date': study.study_date,
            'study_description': study.study_description,
            'patient_name': study.patient.patient_name,
            'patient_id': study.patient.patient_id,
            'modality': study.modality,
        },
        'series': series_data
    })


@api_view(['GET'])
def system_status(request):
    """Get PACS system status"""
    from django.db.models import Count, Sum
    
    # Check SCP connection
    scp_connected, scp_message = dicom_scu_client.verify_connection()
    
    # Get statistics
    stats = {
        'patients': Patient.objects.count(),
        'studies': Study.objects.count(),
        'series': Series.objects.count(),
        'images': DicomImage.objects.count(),
        'storage': {
            'total_files': DicomImage.objects.count(),
            'total_size_mb': DicomImage.objects.aggregate(
                total=Sum('file_size')
            )['total'] or 0,
        },
        'scp_server': {
            'connected': scp_connected,
            'message': scp_message,
            'host': settings.DICOM_SCP_HOST if hasattr(settings, 'DICOM_SCP_HOST') else 'localhost',
            'port': settings.DICOM_SCP_PORT if hasattr(settings, 'DICOM_SCP_PORT') else 11112,
        }
    }
    
    return Response({
        'status': 'success',
        'stats': stats
    })