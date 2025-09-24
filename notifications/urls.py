from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    path('test-websockets/', views.test_websockets, name='test_websockets'),
    path('list/', views.notifications_list, name='list'),
    path('mark-read/<uuid:notification_id>/', views.mark_notification_read, name='mark_read'),
    # API endpoints
    path('api/test-notification/', views.test_notification_api, name='test_notification_api'),
    path('api/unread-count/', views.api_unread_count, name='api_unread_count'),
]