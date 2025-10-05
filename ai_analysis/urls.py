"""
NoctisPro PACS - AI Analysis URLs
AI-powered medical image analysis endpoints
"""

from django.urls import path
from . import views

app_name = 'ai_analysis'

urlpatterns = [
    # Dashboard
    path('', views.AIDashboardView.as_view(), name='dashboard'),
    
    # Analysis Management
    path('analyses/', views.AnalysisListView.as_view(), name='analysis_list'),
    path('analyses/create/<int:study_id>/', views.CreateAnalysisView.as_view(), name='create_analysis'),
    path('analyses/<int:analysis_id>/', views.AnalysisDetailView.as_view(), name='analysis_detail'),
    path('analyses/<int:analysis_id>/results/', views.AnalysisResultsView.as_view(), name='analysis_results'),
    path('analyses/<int:analysis_id>/delete/', views.DeleteAnalysisView.as_view(), name='delete_analysis'),
    path('analyses/<int:analysis_id>/retry/', views.RetryAnalysisView.as_view(), name='retry_analysis'),
    
    # Analysis Review
    path('analyses/<int:analysis_id>/review/', views.ReviewAnalysisView.as_view(), name='review_analysis'),
    path('analyses/<int:analysis_id>/approve/', views.ApproveAnalysisView.as_view(), name='approve_analysis'),
    path('analyses/<int:analysis_id>/reject/', views.RejectAnalysisView.as_view(), name='reject_analysis'),
    
    # Auto-Generated Reports
    path('auto-reports/', views.AutoReportListView.as_view(), name='auto_report_list'),
    path('auto-reports/<int:report_id>/', views.AutoReportDetailView.as_view(), name='auto_report_detail'),
    path('auto-reports/<int:report_id>/approve/', views.ApproveAutoReportView.as_view(), name='approve_auto_report'),
    path('auto-reports/<int:report_id>/modify/', views.ModifyAutoReportView.as_view(), name='modify_auto_report'),
    path('auto-reports/<int:report_id>/reject/', views.RejectAutoReportView.as_view(), name='reject_auto_report'),
    
    # Report Templates
    path('templates/', views.AutoReportTemplateListView.as_view(), name='template_list'),
    path('templates/create/', views.CreateAutoReportTemplateView.as_view(), name='create_template'),
    path('templates/<int:template_id>/edit/', views.EditAutoReportTemplateView.as_view(), name='edit_template'),
    path('templates/<int:template_id>/delete/', views.DeleteAutoReportTemplateView.as_view(), name='delete_template'),
    
    # AI Models
    path('models/', views.AIModelListView.as_view(), name='model_list'),
    path('models/<int:model_id>/', views.AIModelDetailView.as_view(), name='model_detail'),
    path('models/<int:model_id>/activate/', views.ActivateModelView.as_view(), name='activate_model'),
    path('models/<int:model_id>/deactivate/', views.DeactivateModelView.as_view(), name='deactivate_model'),
    path('models/<int:model_id>/performance/', views.ModelPerformanceView.as_view(), name='model_performance'),
    
    # Urgent Alerts
    path('alerts/', views.UrgentAlertListView.as_view(), name='alert_list'),
    path('alerts/<int:alert_id>/', views.UrgentAlertDetailView.as_view(), name='alert_detail'),
    path('alerts/<int:alert_id>/acknowledge/', views.AcknowledgeAlertView.as_view(), name='acknowledge_alert'),
    path('alerts/<int:alert_id>/resolve/', views.ResolveAlertView.as_view(), name='resolve_alert'),
    path('alerts/<int:alert_id>/escalate/', views.EscalateAlertView.as_view(), name='escalate_alert'),
    
    # Feedback
    path('analyses/<int:analysis_id>/feedback/', views.AnalysisFeedbackView.as_view(), name='analysis_feedback'),
    path('feedback/', views.FeedbackListView.as_view(), name='feedback_list'),
    path('feedback/<int:feedback_id>/', views.FeedbackDetailView.as_view(), name='feedback_detail'),
    
    # Training Data
    path('training-data/', views.TrainingDataListView.as_view(), name='training_data_list'),
    path('training-data/add/', views.AddTrainingDataView.as_view(), name='add_training_data'),
    path('training-data/<int:data_id>/validate/', views.ValidateTrainingDataView.as_view(), name='validate_training_data'),
    
    # Performance Metrics
    path('metrics/', views.PerformanceMetricsView.as_view(), name='metrics'),
    path('metrics/<int:model_id>/', views.ModelMetricsView.as_view(), name='model_metrics'),
    
    # Batch Processing
    path('batch/', views.BatchProcessingView.as_view(), name='batch_processing'),
    path('batch/create/', views.CreateBatchJobView.as_view(), name='create_batch_job'),
    path('batch/<int:job_id>/', views.BatchJobDetailView.as_view(), name='batch_job_detail'),
    
    # Statistics
    path('statistics/', views.AIStatisticsView.as_view(), name='statistics'),
    
    # API Endpoints
    path('api/analyze/<int:study_id>/', views.AnalyzeStudyAPIView.as_view(), name='api_analyze_study'),
    path('api/analyses/<int:analysis_id>/status/', views.AnalysisStatusAPIView.as_view(), name='api_analysis_status'),
    path('api/alerts/active/', views.ActiveAlertsAPIView.as_view(), name='api_active_alerts'),
    path('api/models/available/', views.AvailableModelsAPIView.as_view(), name='api_available_models'),
]
