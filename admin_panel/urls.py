"""
NoctisPro PACS - Admin Panel URLs
System administration and management endpoints
"""

from django.urls import path
from . import views

app_name = 'admin_panel'

urlpatterns = [
    # Dashboard
    path('', views.AdminDashboardView.as_view(), name='dashboard'),
    
    # System Overview
    path('overview/', views.SystemOverviewView.as_view(), name='overview'),
    path('health/', views.SystemHealthView.as_view(), name='health'),
    path('status/', views.SystemStatusView.as_view(), name='status'),
    
    # User Management
    path('users/', views.UserManagementView.as_view(), name='user_management'),
    path('users/bulk-actions/', views.BulkUserActionsView.as_view(), name='bulk_user_actions'),
    path('users/export/', views.ExportUsersView.as_view(), name='export_users'),
    
    # Facility Management
    path('facilities/', views.FacilityManagementView.as_view(), name='facility_management'),
    path('facilities/<int:facility_id>/statistics/', views.FacilityStatisticsView.as_view(), name='facility_statistics'),
    
    # System Configuration
    path('configuration/', views.SystemConfigurationView.as_view(), name='configuration'),
    path('configuration/update/', views.UpdateConfigurationView.as_view(), name='update_configuration'),
    path('configuration/backup/', views.BackupConfigurationView.as_view(), name='backup_configuration'),
    path('configuration/restore/', views.RestoreConfigurationView.as_view(), name='restore_configuration'),
    
    # Backup & Restore
    path('backup/', views.BackupDashboardView.as_view(), name='backup_dashboard'),
    path('backup/create/', views.CreateBackupView.as_view(), name='create_backup'),
    path('backup/list/', views.BackupListView.as_view(), name='backup_list'),
    path('backup/<int:backup_id>/download/', views.DownloadBackupView.as_view(), name='download_backup'),
    path('backup/<int:backup_id>/restore/', views.RestoreBackupView.as_view(), name='restore_backup'),
    path('backup/<int:backup_id>/delete/', views.DeleteBackupView.as_view(), name='delete_backup'),
    path('backup/schedule/', views.BackupScheduleView.as_view(), name='backup_schedule'),
    
    # Audit Log
    path('audit-log/', views.AuditLogView.as_view(), name='audit_log'),
    path('audit-log/export/', views.ExportAuditLogView.as_view(), name='export_audit_log'),
    path('audit-log/search/', views.SearchAuditLogView.as_view(), name='search_audit_log'),
    
    # Usage Statistics
    path('statistics/', views.StatisticsDashboardView.as_view(), name='statistics'),
    path('statistics/studies/', views.StudyStatisticsView.as_view(), name='study_statistics'),
    path('statistics/users/', views.UserStatisticsView.as_view(), name='user_statistics'),
    path('statistics/storage/', views.StorageStatisticsView.as_view(), name='storage_statistics'),
    path('statistics/performance/', views.PerformanceStatisticsView.as_view(), name='performance_statistics'),
    path('statistics/export/', views.ExportStatisticsView.as_view(), name='export_statistics'),
    
    # Invoicing
    path('invoicing/', views.InvoicingDashboardView.as_view(), name='invoicing'),
    path('invoicing/rules/', views.InvoicingRulesView.as_view(), name='invoicing_rules'),
    path('invoicing/rules/create/', views.CreateInvoicingRuleView.as_view(), name='create_invoicing_rule'),
    path('invoicing/rules/<int:rule_id>/edit/', views.EditInvoicingRuleView.as_view(), name='edit_invoicing_rule'),
    path('invoicing/invoices/', views.InvoiceListView.as_view(), name='invoice_list'),
    path('invoicing/invoices/generate/', views.GenerateInvoiceView.as_view(), name='generate_invoice'),
    path('invoicing/invoices/<int:invoice_id>/', views.InvoiceDetailView.as_view(), name='invoice_detail'),
    path('invoicing/invoices/<int:invoice_id>/send/', views.SendInvoiceView.as_view(), name='send_invoice'),
    path('invoicing/invoices/<int:invoice_id>/mark-paid/', views.MarkInvoicePaidView.as_view(), name='mark_invoice_paid'),
    path('invoicing/invoices/<int:invoice_id>/pdf/', views.InvoicePDFView.as_view(), name='invoice_pdf'),
    
    # License Management
    path('license/', views.LicenseInfoView.as_view(), name='license'),
    path('license/update/', views.UpdateLicenseView.as_view(), name='update_license'),
    
    # Maintenance
    path('maintenance/', views.MaintenanceView.as_view(), name='maintenance'),
    path('maintenance/schedule/', views.ScheduleMaintenanceView.as_view(), name='schedule_maintenance'),
    path('maintenance/<int:maintenance_id>/complete/', views.CompleteMaintenanceView.as_view(), name='complete_maintenance'),
    
    # System Monitoring
    path('monitoring/', views.SystemMonitoringView.as_view(), name='monitoring'),
    path('monitoring/logs/', views.SystemLogsView.as_view(), name='system_logs'),
    path('monitoring/errors/', views.ErrorLogsView.as_view(), name='error_logs'),
    path('monitoring/performance/', views.PerformanceMonitoringView.as_view(), name='performance_monitoring'),
    
    # Database Management
    path('database/', views.DatabaseManagementView.as_view(), name='database'),
    path('database/optimize/', views.OptimizeDatabaseView.as_view(), name='optimize_database'),
    path('database/cleanup/', views.CleanupDatabaseView.as_view(), name='cleanup_database'),
    path('database/statistics/', views.DatabaseStatisticsView.as_view(), name='database_statistics'),
    
    # Storage Management
    path('storage/', views.StorageManagementView.as_view(), name='storage'),
    path('storage/cleanup/', views.CleanupStorageView.as_view(), name='cleanup_storage'),
    path('storage/optimize/', views.OptimizeStorageView.as_view(), name='optimize_storage'),
    
    # Security
    path('security/', views.SecurityDashboardView.as_view(), name='security'),
    path('security/sessions/', views.ActiveSessionsView.as_view(), name='active_sessions'),
    path('security/failed-logins/', views.FailedLoginsView.as_view(), name='failed_logins'),
    path('security/ip-whitelist/', views.IPWhitelistView.as_view(), name='ip_whitelist'),
    path('security/ip-blacklist/', views.IPBlacklistView.as_view(), name='ip_blacklist'),
    
    # API Endpoints
    path('api/system/status/', views.SystemStatusAPIView.as_view(), name='api_system_status'),
    path('api/statistics/summary/', views.StatisticsSummaryAPIView.as_view(), name='api_statistics_summary'),
    path('api/monitoring/metrics/', views.MonitoringMetricsAPIView.as_view(), name='api_monitoring_metrics'),
]
