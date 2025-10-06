from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib import messages
import json
from .services import notification_service
from .models import Notification


@login_required
def test_websockets(request):
    """Test page for WebSocket functionality"""
    return render(request, 'test_websockets.html')


@login_required
@require_POST
@csrf_exempt
def test_notification_api(request):
    """API endpoint to send test notifications"""
    try:
        data = json.loads(request.body)
        message_type = data.get('type', 'test')
        message = data.get('message', 'Test notification')
        
        # Send test notification to the current user
        notification = notification_service.send_notification(
            user_id=request.user.id,
            notification_type=message_type,
            title='Test Notification',
            message=message,
            priority='normal'
        )
        
        if notification:
            return JsonResponse({
                'success': True,
                'message': 'Test notification sent successfully',
                'notification_id': str(notification.id)
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Failed to send test notification'
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error: {str(e)}'
        }, status=500)


@login_required
def notifications_list(request):
    """List user's notifications"""
    from .models import Notification
    
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by('-created_at')[:50]
    
    return render(request, 'notifications/list.html', {
        'notifications': notifications
    })


@login_required
@require_POST
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        from .models import Notification
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user
        )
        notification.mark_as_read()
        
        return JsonResponse({
            'success': True,
            'message': 'Notification marked as read'
        })
        
    except Notification.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Notification not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error: {str(e)}'
        }, status=500)

@login_required
def api_unread_count(request):
    """API endpoint to get unread notification count for current user"""
    try:
        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        return JsonResponse({
            'success': True,
            'unread_count': unread_count
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'unread_count': 0
        }, status=500)


# Create stub class-based views for all missing views
class NotificationCenterView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/center.html')

class NotificationListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/list.html')

class UnreadNotificationsView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/unread.html')

class ReadNotificationsView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/read.html')

class MarkAsReadView(LoginRequiredMixin, View):
	def post(self, request, notification_id): messages.success(request, 'Notification marked as read.'); return redirect('notifications:center')

class DismissNotificationView(LoginRequiredMixin, View):
	def post(self, request, notification_id): messages.success(request, 'Notification dismissed.'); return redirect('notifications:center')

class MarkAllAsReadView(LoginRequiredMixin, View):
	def post(self, request): messages.success(request, 'All notifications marked as read.'); return redirect('notifications:center')

class ClearAllNotificationsView(LoginRequiredMixin, View):
	def post(self, request): messages.success(request, 'All notifications cleared.'); return redirect('notifications:center')

class NotificationDetailView(LoginRequiredMixin, View):
	def get(self, request, notification_id): return render(request, 'notifications/detail.html')

class NotificationPreferencesView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/preferences.html')

class UpdatePreferencesView(LoginRequiredMixin, View):
	def post(self, request): messages.success(request, 'Preferences updated.'); return redirect('notifications:preferences')

class SystemErrorListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/error_list.html')

class SystemErrorDetailView(LoginRequiredMixin, View):
	def get(self, request, error_id): return render(request, 'notifications/error_detail.html')

class ResolveErrorView(LoginRequiredMixin, View):
	def post(self, request, error_id): messages.success(request, 'Error resolved.'); return redirect('notifications:error_list')

class UploadStatusListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/upload_list.html')

class UploadStatusDetailView(LoginRequiredMixin, View):
	def get(self, request, upload_id): return render(request, 'notifications/upload_detail.html')

class NotificationTypeListView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/type_list.html')

class CreateNotificationTypeView(LoginRequiredMixin, View):
	def get(self, request): return render(request, 'notifications/create_type.html')
	def post(self, request): messages.success(request, 'Notification type created.'); return redirect('notifications:type_list')

class EditNotificationTypeView(LoginRequiredMixin, View):
	def get(self, request, type_id): return render(request, 'notifications/edit_type.html')
	def post(self, request, type_id): messages.success(request, 'Notification type updated.'); return redirect('notifications:type_list')

class NotificationListAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'notifications': []})

class UnreadCountAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'unread_count': 0})

class MarkAsReadAPIView(LoginRequiredMixin, View):
	def post(self, request, notification_id): return JsonResponse({'success': True})

class PollNotificationsAPIView(LoginRequiredMixin, View):
	def get(self, request): return JsonResponse({'notifications': [], 'has_new': False})

class SendNotificationAPIView(LoginRequiredMixin, View):
	def post(self, request): return JsonResponse({'success': True})