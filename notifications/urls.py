"""
NoctisPro PACS - Notifications URLs
Real-time notification and alert endpoints
"""

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # Notification Center
    path('', views.NotificationCenterView.as_view(), name='center'),
    
    # Notification List
    path('list/', views.NotificationListView.as_view(), name='list'),
    path('unread/', views.UnreadNotificationsView.as_view(), name='unread'),
    path('read/', views.ReadNotificationsView.as_view(), name='read'),
    
    # Notification Actions
    path('<int:notification_id>/mark-read/', views.MarkAsReadView.as_view(), name='mark_read'),
    path('<int:notification_id>/dismiss/', views.DismissNotificationView.as_view(), name='dismiss'),
    path('mark-all-read/', views.MarkAllAsReadView.as_view(), name='mark_all_read'),
    path('clear-all/', views.ClearAllNotificationsView.as_view(), name='clear_all'),
    
    # Notification Detail
    path('<int:notification_id>/', views.NotificationDetailView.as_view(), name='detail'),
    
    # Notification Preferences
    path('preferences/', views.NotificationPreferencesView.as_view(), name='preferences'),
    path('preferences/update/', views.UpdatePreferencesView.as_view(), name='update_preferences'),
    
    # System Errors (Admin only)
    path('errors/', views.SystemErrorListView.as_view(), name='error_list'),
    path('errors/<int:error_id>/', views.SystemErrorDetailView.as_view(), name='error_detail'),
    path('errors/<int:error_id>/resolve/', views.ResolveErrorView.as_view(), name='resolve_error'),
    
    # Upload Status Tracking
    path('uploads/', views.UploadStatusListView.as_view(), name='upload_list'),
    path('uploads/<int:upload_id>/', views.UploadStatusDetailView.as_view(), name='upload_detail'),
    
    # Notification Types Management (Admin only)
    path('types/', views.NotificationTypeListView.as_view(), name='type_list'),
    path('types/create/', views.CreateNotificationTypeView.as_view(), name='create_type'),
    path('types/<int:type_id>/edit/', views.EditNotificationTypeView.as_view(), name='edit_type'),
    
    # API Endpoints
    path('api/notifications/', views.NotificationListAPIView.as_view(), name='api_list'),
    path('api/notifications/unread-count/', views.UnreadCountAPIView.as_view(), name='api_unread_count'),
    path('api/notifications/<int:notification_id>/mark-read/', views.MarkAsReadAPIView.as_view(), name='api_mark_read'),
    path('api/notifications/poll/', views.PollNotificationsAPIView.as_view(), name='api_poll'),
    path('api/send/', views.SendNotificationAPIView.as_view(), name='api_send'),
]
