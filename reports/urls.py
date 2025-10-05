"""
NoctisPro PACS - Reports URLs
Medical report management endpoints
"""

from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    # Report Dashboard
    path('', views.ReportDashboardView.as_view(), name='dashboard'),
    
    # Report Management
    path('list/', views.ReportListView.as_view(), name='report_list'),
    path('create/<int:study_id>/', views.CreateReportView.as_view(), name='create_report'),
    path('<int:report_id>/', views.ReportDetailView.as_view(), name='report_detail'),
    path('<int:report_id>/edit/', views.EditReportView.as_view(), name='edit_report'),
    path('<int:report_id>/delete/', views.DeleteReportView.as_view(), name='delete_report'),
    
    # Report Workflow
    path('<int:report_id>/sign/', views.SignReportView.as_view(), name='sign_report'),
    path('<int:report_id>/approve/', views.ApproveReportView.as_view(), name='approve_report'),
    path('<int:report_id>/amend/', views.AmendReportView.as_view(), name='amend_report'),
    path('<int:report_id>/cancel/', views.CancelReportView.as_view(), name='cancel_report'),
    path('<int:report_id>/revert/', views.RevertReportView.as_view(), name='revert_report'),
    
    # Report Viewing
    path('<int:report_id>/view/', views.ViewReportView.as_view(), name='view_report'),
    path('<int:report_id>/preview/', views.PreviewReportView.as_view(), name='preview_report'),
    path('<int:report_id>/print/', views.PrintReportView.as_view(), name='print_report'),
    path('<int:report_id>/pdf/', views.GeneratePDFView.as_view(), name='generate_pdf'),
    
    # Report Versions
    path('<int:report_id>/versions/', views.ReportVersionsView.as_view(), name='report_versions'),
    path('<int:report_id>/versions/<int:version_id>/', views.ViewReportVersionView.as_view(), name='view_report_version'),
    
    # Report Templates
    path('templates/', views.TemplateListView.as_view(), name='template_list'),
    path('templates/create/', views.CreateTemplateView.as_view(), name='create_template'),
    path('templates/<int:template_id>/', views.TemplateDetailView.as_view(), name='template_detail'),
    path('templates/<int:template_id>/edit/', views.EditTemplateView.as_view(), name='edit_template'),
    path('templates/<int:template_id>/delete/', views.DeleteTemplateView.as_view(), name='delete_template'),
    path('templates/<int:template_id>/preview/', views.PreviewTemplateView.as_view(), name='preview_template'),
    
    # Report Attachments
    path('<int:report_id>/attachments/', views.ReportAttachmentsView.as_view(), name='report_attachments'),
    path('<int:report_id>/attachments/add/', views.AddReportAttachmentView.as_view(), name='add_attachment'),
    path('attachments/<int:attachment_id>/delete/', views.DeleteReportAttachmentView.as_view(), name='delete_attachment'),
    
    # Report Comments
    path('<int:report_id>/comments/', views.ReportCommentsView.as_view(), name='report_comments'),
    path('<int:report_id>/comments/add/', views.AddReportCommentView.as_view(), name='add_comment'),
    path('comments/<int:comment_id>/edit/', views.EditReportCommentView.as_view(), name='edit_comment'),
    path('comments/<int:comment_id>/delete/', views.DeleteReportCommentView.as_view(), name='delete_comment'),
    
    # Macro Text (Report Snippets)
    path('macros/', views.MacroListView.as_view(), name='macro_list'),
    path('macros/create/', views.CreateMacroView.as_view(), name='create_macro'),
    path('macros/<int:macro_id>/edit/', views.EditMacroView.as_view(), name='edit_macro'),
    path('macros/<int:macro_id>/delete/', views.DeleteMacroView.as_view(), name='delete_macro'),
    
    # Report Search
    path('search/', views.ReportSearchView.as_view(), name='search'),
    
    # Report Statistics
    path('statistics/', views.ReportStatisticsView.as_view(), name='statistics'),
    path('statistics/radiologist/<int:user_id>/', views.RadiologistStatisticsView.as_view(), name='radiologist_statistics'),
    
    # Report Export
    path('export/', views.ExportReportsView.as_view(), name='export'),
    
    # API Endpoints
    path('api/reports/', views.ReportListAPIView.as_view(), name='api_report_list'),
    path('api/reports/<int:report_id>/', views.ReportDetailAPIView.as_view(), name='api_report_detail'),
    path('api/templates/', views.TemplateListAPIView.as_view(), name='api_template_list'),
    path('api/macros/', views.MacroListAPIView.as_view(), name='api_macro_list'),
    path('api/reports/<int:report_id>/status/', views.UpdateReportStatusAPIView.as_view(), name='api_update_status'),
]
