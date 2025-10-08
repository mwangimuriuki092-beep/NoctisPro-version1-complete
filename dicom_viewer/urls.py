from django.urls import path
from . import views, api_views

app_name = 'dicom_viewer'

urlpatterns = [
    # Main viewer views
    path('viewer/<uuid:study_id>/', views.viewer, name='viewer'),
    path('viewer/<uuid:study_id>/series/<uuid:series_id>/', views.viewer_series, name='viewer_series'),
    
    # Image operations
    path('image/<uuid:image_id>/raw/', views.get_dicom_raw, name='get_dicom_raw'),
    path('image/<uuid:image_id>/preview/', views.get_image_preview, name='get_image_preview'),
    path('image/<uuid:image_id>/thumbnail/', views.get_image_thumbnail, name='get_image_thumbnail'),
    
    # MPR and 3D operations
    path('mpr/<uuid:series_id>/', views.mpr_viewer, name='mpr_viewer'),
    path('mpr/slice/', views.get_mpr_slice, name='get_mpr_slice'),
    path('3d/<uuid:series_id>/', views.reconstruction_3d, name='reconstruction_3d'),
    
    # API endpoints
    path('api/scp/test/', api_views.test_scp_connection, name='api_test_scp'),
    path('api/upload/', api_views.upload_dicom, name='api_upload'),
    path('api/images/<uuid:image_id>/metadata/', api_views.get_dicom_metadata, name='api_metadata'),
    path('api/images/<uuid:image_id>/file/', api_views.get_dicom_file, name='api_file'),
    path('api/series/<uuid:series_id>/images/', api_views.get_series_images, name='api_series_images'),
    path('api/studies/<uuid:study_id>/', api_views.get_study_data, name='api_study_data'),
    path('api/system/status/', api_views.system_status, name='api_system_status'),
    
    # Legacy endpoints for compatibility
    path('get_image/<uuid:image_id>/', views.get_image, name='get_image'),
    path('get_series_images/<uuid:series_id>/', views.get_series_images_json, name='get_series_images'),
]