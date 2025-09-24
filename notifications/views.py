from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
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