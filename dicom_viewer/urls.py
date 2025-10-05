"""
NoctisPro PACS - DICOM Viewer URLs
Medical image viewing and analysis endpoints
"""

from django.urls import path
from . import views

app_name = 'dicom_viewer'

urlpatterns = [
    # Main Viewer
    path('', views.ViewerIndexView.as_view(), name='index'),
    path('viewer/<int:study_id>/', views.ViewerView.as_view(), name='viewer'),
    path('viewer/series/<int:series_id>/', views.SeriesViewerView.as_view(), name='series_viewer'),
    
    # Image Serving
    path('api/image/<int:image_id>/', views.GetImageView.as_view(), name='api_get_image'),
    path('api/image/<int:image_id>/dicom/', views.GetDicomImageView.as_view(), name='api_get_dicom'),
    path('api/image/<int:image_id>/thumbnail/', views.GetThumbnailView.as_view(), name='api_get_thumbnail'),
    path('api/image/<int:image_id>/preview/', views.GetPreviewView.as_view(), name='api_get_preview'),
    
    # Study/Series Data
    path('api/study/<int:study_id>/metadata/', views.GetStudyMetadataView.as_view(), name='api_study_metadata'),
    path('api/series/<int:series_id>/metadata/', views.GetSeriesMetadataView.as_view(), name='api_series_metadata'),
    path('api/series/<int:series_id>/images/', views.GetSeriesImagesView.as_view(), name='api_series_images'),
    
    # Viewer Sessions
    path('api/session/save/', views.SaveViewerSessionView.as_view(), name='api_save_session'),
    path('api/session/load/<int:study_id>/', views.LoadViewerSessionView.as_view(), name='api_load_session'),
    
    # Measurements
    path('api/measurements/', views.MeasurementListView.as_view(), name='api_measurement_list'),
    path('api/measurements/create/', views.CreateMeasurementView.as_view(), name='api_create_measurement'),
    path('api/measurements/<int:measurement_id>/', views.MeasurementDetailView.as_view(), name='api_measurement_detail'),
    path('api/measurements/<int:measurement_id>/delete/', views.DeleteMeasurementView.as_view(), name='api_delete_measurement'),
    path('api/image/<int:image_id>/measurements/', views.ImageMeasurementsView.as_view(), name='api_image_measurements'),
    
    # Annotations
    path('api/annotations/', views.AnnotationListView.as_view(), name='api_annotation_list'),
    path('api/annotations/create/', views.CreateAnnotationView.as_view(), name='api_create_annotation'),
    path('api/annotations/<int:annotation_id>/', views.AnnotationDetailView.as_view(), name='api_annotation_detail'),
    path('api/annotations/<int:annotation_id>/update/', views.UpdateAnnotationView.as_view(), name='api_update_annotation'),
    path('api/annotations/<int:annotation_id>/delete/', views.DeleteAnnotationView.as_view(), name='api_delete_annotation'),
    path('api/image/<int:image_id>/annotations/', views.ImageAnnotationsView.as_view(), name='api_image_annotations'),
    
    # Window/Level Presets
    path('api/presets/', views.WindowLevelPresetListView.as_view(), name='api_preset_list'),
    path('api/presets/create/', views.CreatePresetView.as_view(), name='api_create_preset'),
    path('api/presets/<int:preset_id>/delete/', views.DeletePresetView.as_view(), name='api_delete_preset'),
    
    # Hanging Protocols
    path('api/hanging-protocols/', views.HangingProtocolListView.as_view(), name='api_hanging_protocol_list'),
    path('api/hanging-protocols/match/', views.MatchHangingProtocolView.as_view(), name='api_match_hanging_protocol'),
    
    # 3D Reconstruction
    path('api/reconstruction/', views.ReconstructionListView.as_view(), name='api_reconstruction_list'),
    path('api/reconstruction/create/', views.CreateReconstructionView.as_view(), name='api_create_reconstruction'),
    path('api/reconstruction/<int:job_id>/', views.ReconstructionDetailView.as_view(), name='api_reconstruction_detail'),
    path('api/reconstruction/<int:job_id>/status/', views.ReconstructionStatusView.as_view(), name='api_reconstruction_status'),
    path('api/reconstruction/<int:job_id>/result/', views.ReconstructionResultView.as_view(), name='api_reconstruction_result'),
    
    # MPR (Multiplanar Reconstruction)
    path('api/mpr/<int:series_id>/', views.MPRViewView.as_view(), name='api_mpr'),
    path('api/mpr/<int:series_id>/slice/', views.MPRSliceView.as_view(), name='api_mpr_slice'),
    
    # Image Processing
    path('api/image/<int:image_id>/process/', views.ProcessImageView.as_view(), name='api_process_image'),
    path('api/image/<int:image_id>/enhance/', views.EnhanceImageView.as_view(), name='api_enhance_image'),
    path('api/image/<int:image_id>/filter/', views.FilterImageView.as_view(), name='api_filter_image'),
    
    # Export
    path('api/export/image/<int:image_id>/', views.ExportImageView.as_view(), name='api_export_image'),
    path('api/export/series/<int:series_id>/', views.ExportSeriesView.as_view(), name='api_export_series'),
    path('api/export/study/<int:study_id>/', views.ExportStudyView.as_view(), name='api_export_study'),
    path('api/export/screenshot/', views.ExportScreenshotView.as_view(), name='api_export_screenshot'),
    
    # Print
    path('api/print/image/<int:image_id>/', views.PrintImageView.as_view(), name='api_print_image'),
    path('api/print/series/<int:series_id>/', views.PrintSeriesView.as_view(), name='api_print_series'),
    path('api/print/study/<int:study_id>/', views.PrintStudyView.as_view(), name='api_print_study'),
    
    # QR Code
    path('api/qrcode/<int:study_id>/', views.GenerateQRCodeView.as_view(), name='api_generate_qrcode'),
    
    # Hounsfield Calibration (CT specific)
    path('api/hounsfield/calibration/<int:study_id>/', views.HounsfieldCalibrationView.as_view(), name='api_hounsfield_calibration'),
    path('api/hounsfield/validate/<int:series_id>/', views.ValidateHounsfieldView.as_view(), name='api_validate_hounsfield'),
    
    # Cine Loop
    path('api/cine/<int:series_id>/', views.CineLoopView.as_view(), name='api_cine_loop'),
    
    # Compare Studies
    path('compare/<int:study_id1>/<int:study_id2>/', views.CompareStudiesView.as_view(), name='compare_studies'),
    path('api/compare/metadata/', views.CompareMetadataView.as_view(), name='api_compare_metadata'),
]
