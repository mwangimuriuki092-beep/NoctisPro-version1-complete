"""
NoctisPro PACS - Worklist URLs
Patient and study management endpoints
"""

from django.urls import path
from . import views

app_name = 'worklist'

urlpatterns = [
    # Dashboard
    path('', views.WorklistDashboardView.as_view(), name='dashboard'),
    
    # Patient Management
    path('patients/', views.PatientListView.as_view(), name='patient_list'),
    path('patients/create/', views.PatientCreateView.as_view(), name='patient_create'),
    path('patients/<int:patient_id>/', views.PatientDetailView.as_view(), name='patient_detail'),
    path('patients/<int:patient_id>/edit/', views.PatientEditView.as_view(), name='patient_edit'),
    path('patients/<int:patient_id>/delete/', views.PatientDeleteView.as_view(), name='patient_delete'),
    path('patients/<int:patient_id>/merge/', views.PatientMergeView.as_view(), name='patient_merge'),
    path('patients/<int:patient_id>/studies/', views.PatientStudiesView.as_view(), name='patient_studies'),
    path('patients/<int:patient_id>/history/', views.PatientHistoryView.as_view(), name='patient_history'),
    
    # Study Management
    path('studies/', views.StudyListView.as_view(), name='study_list'),
    path('studies/upload/', views.StudyUploadView.as_view(), name='study_upload'),
    path('studies/bulk-upload/', views.BulkUploadView.as_view(), name='bulk_upload'),
    path('studies/<int:study_id>/', views.StudyDetailView.as_view(), name='study_detail'),
    path('studies/<int:study_id>/edit/', views.StudyEditView.as_view(), name='study_edit'),
    path('studies/<int:study_id>/delete/', views.StudyDeleteView.as_view(), name='study_delete'),
    path('studies/<int:study_id>/assign/', views.AssignRadiologistView.as_view(), name='study_assign'),
    path('studies/<int:study_id>/status/', views.UpdateStudyStatusView.as_view(), name='study_status'),
    path('studies/<int:study_id>/priority/', views.UpdateStudyPriorityView.as_view(), name='study_priority'),
    
    # Study Viewer Integration
    path('studies/<int:study_id>/view/', views.ViewStudyView.as_view(), name='study_view'),
    path('studies/<int:study_id>/viewer/', views.DicomViewerRedirectView.as_view(), name='study_viewer'),
    
    # Series Management
    path('studies/<int:study_id>/series/', views.SeriesListView.as_view(), name='series_list'),
    path('studies/<int:study_id>/series/<int:series_id>/', views.SeriesDetailView.as_view(), name='series_detail'),
    path('studies/<int:study_id>/series/<int:series_id>/images/', views.SeriesImagesView.as_view(), name='series_images'),
    
    # Image Management
    path('images/<int:image_id>/', views.ImageDetailView.as_view(), name='image_detail'),
    path('images/<int:image_id>/download/', views.ImageDownloadView.as_view(), name='image_download'),
    path('images/<int:image_id>/thumbnail/', views.ImageThumbnailView.as_view(), name='image_thumbnail'),
    path('images/<int:image_id>/preview/', views.ImagePreviewView.as_view(), name='image_preview'),
    
    # Study Attachments
    path('studies/<int:study_id>/attachments/', views.AttachmentListView.as_view(), name='attachment_list'),
    path('studies/<int:study_id>/attachments/upload/', views.AttachmentUploadView.as_view(), name='attachment_upload'),
    path('attachments/<int:attachment_id>/', views.AttachmentDetailView.as_view(), name='attachment_detail'),
    path('attachments/<int:attachment_id>/download/', views.AttachmentDownloadView.as_view(), name='attachment_download'),
    path('attachments/<int:attachment_id>/delete/', views.AttachmentDeleteView.as_view(), name='attachment_delete'),
    path('attachments/<int:attachment_id>/view/', views.AttachmentViewView.as_view(), name='attachment_view'),
    
    # Study Notes
    path('studies/<int:study_id>/notes/', views.StudyNotesView.as_view(), name='study_notes'),
    path('studies/<int:study_id>/notes/add/', views.AddStudyNoteView.as_view(), name='add_note'),
    path('notes/<int:note_id>/edit/', views.EditStudyNoteView.as_view(), name='edit_note'),
    path('notes/<int:note_id>/delete/', views.DeleteStudyNoteView.as_view(), name='delete_note'),
    
    # Modality Management
    path('modalities/', views.ModalityListView.as_view(), name='modality_list'),
    path('modalities/create/', views.ModalityCreateView.as_view(), name='modality_create'),
    path('modalities/<int:modality_id>/edit/', views.ModalityEditView.as_view(), name='modality_edit'),
    
    # Worklist Filters
    path('worklist/', views.WorklistView.as_view(), name='worklist'),
    path('worklist/my-studies/', views.MyStudiesView.as_view(), name='my_studies'),
    path('worklist/urgent/', views.UrgentStudiesView.as_view(), name='urgent_studies'),
    path('worklist/unassigned/', views.UnassignedStudiesView.as_view(), name='unassigned_studies'),
    path('worklist/scheduled/', views.ScheduledStudiesView.as_view(), name='scheduled_studies'),
    path('worklist/in-progress/', views.InProgressStudiesView.as_view(), name='in_progress_studies'),
    path('worklist/completed/', views.CompletedStudiesView.as_view(), name='completed_studies'),
    
    # Search
    path('search/', views.SearchView.as_view(), name='search'),
    path('search/advanced/', views.AdvancedSearchView.as_view(), name='advanced_search'),
    
    # Export
    path('export/studies/', views.ExportStudiesView.as_view(), name='export_studies'),
    path('export/csv/', views.ExportCSVView.as_view(), name='export_csv'),
    path('export/dicom/', views.ExportDicomView.as_view(), name='export_dicom'),
    
    # Statistics
    path('statistics/', views.WorklistStatisticsView.as_view(), name='statistics'),
    path('statistics/facility/', views.FacilityStatisticsView.as_view(), name='facility_statistics'),
    
    # API Endpoints
    path('api/studies/', views.StudyListAPIView.as_view(), name='api_study_list'),
    path('api/studies/<int:study_id>/', views.StudyDetailAPIView.as_view(), name='api_study_detail'),
    path('api/patients/', views.PatientListAPIView.as_view(), name='api_patient_list'),
    path('api/patients/<int:patient_id>/', views.PatientDetailAPIView.as_view(), name='api_patient_detail'),
    path('api/search/', views.SearchAPIView.as_view(), name='api_search'),
    path('api/upload-status/<str:upload_id>/', views.UploadStatusAPIView.as_view(), name='api_upload_status'),
]
