from django.urls import path
from . import views

app_name = 'ai_analysis'

urlpatterns = [
    # Main interfaces
    path('', views.ai_dashboard, name='ai_dashboard'),
    path('study/<int:study_id>/analyze/', views.analyze_study, name='analyze_study'),
    path('models/', views.model_management, name='model_management'),
    
    # Urgent alerts
    path('alerts/', views.urgent_alerts_dashboard, name='urgent_alerts_dashboard'),
    path('alerts/<int:alert_id>/', views.urgent_alert_detail, name='urgent_alert_detail'),
    path('api/alerts/<int:alert_id>/status/', views.api_urgent_alert_status, name='api_urgent_alert_status'),
    
    # AI Analysis API endpoints
    path('api/analysis/<int:analysis_id>/status/', views.api_analysis_status, name='api_analysis_status'),
    path('api/analysis/<int:analysis_id>/feedback/', views.api_ai_feedback, name='api_ai_feedback'),
    path('api/realtime/analyses/', views.api_realtime_analyses, name='api_realtime_analyses'),
    
    # Auto-report generation
    path('api/study/<int:study_id>/generate-report/', views.generate_auto_report, name='generate_auto_report'),
    path('report/<int:report_id>/review/', views.review_auto_report, name='review_auto_report'),

    # Evidence and references
    path('api/references/', views.api_medical_references, name='api_medical_references'),
    
    # Model management and verification
    path('models/verify/', views.verify_ai_models, name='verify_ai_models'),
    path('api/model/<int:model_id>/test/', views.run_model_test, name='run_model_test'),
    path('reporting/', views.ai_reporting_dashboard, name='ai_reporting_dashboard'),
]