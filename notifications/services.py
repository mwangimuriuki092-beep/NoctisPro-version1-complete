"""
Notification services for real-time notifications
"""
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from .models import Notification, NotificationType
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationService:
    """Service for handling real-time notifications"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def send_notification(self, user_id, notification_type, title, message, **kwargs):
        """
        Send a real-time notification to a specific user
        """
        try:
            # Create database notification
            user = User.objects.get(id=user_id)
            notification_type_obj, _ = NotificationType.objects.get_or_create(
                code=notification_type,
                defaults={
                    'name': notification_type.replace('_', ' ').title(),
                    'is_system': True
                }
            )
            
            notification = Notification.objects.create(
                notification_type=notification_type_obj,
                recipient=user,
                title=title,
                message=message,
                priority=kwargs.get('priority', 'normal'),
                data=kwargs.get('data', {}),
                action_url=kwargs.get('action_url', '')
            )
            
            # Send real-time notification via WebSocket
            if self.channel_layer:
                async_to_sync(self.channel_layer.group_send)(
                    f'notifications_{user_id}',
                    {
                        'type': 'send_notification',
                        'notification_type': notification_type,
                        'message': message,
                        'title': title,
                        'notification_id': str(notification.id),
                        'priority': notification.priority,
                        'action_url': notification.action_url,
                        'timestamp': notification.created_at.isoformat()
                    }
                )
                logger.info(f"Sent real-time notification to user {user_id}: {title}")
            
            return notification
            
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found for notification")
            return None
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}")
            return None
    
    def send_system_notification(self, notification_type, title, message, **kwargs):
        """
        Send a system notification to all active users
        """
        try:
            active_users = User.objects.filter(is_active=True)
            notifications = []
            
            for user in active_users:
                notification = self.send_notification(
                    user.id, notification_type, title, message, **kwargs
                )
                if notification:
                    notifications.append(notification)
            
            logger.info(f"Sent system notification to {len(notifications)} users")
            return notifications
            
        except Exception as e:
            logger.error(f"Error sending system notification: {str(e)}")
            return []
    
    def send_study_notification(self, study, notification_type, title, message, **kwargs):
        """
        Send a notification related to a specific study
        """
        try:
            # Send to study's facility users
            facility_users = User.objects.filter(
                facility=study.facility,
                is_active=True
            )
            
            notifications = []
            for user in facility_users:
                notification = self.send_notification(
                    user.id, notification_type, title, message,
                    study=study,
                    **kwargs
                )
                if notification:
                    notifications.append(notification)
            
            logger.info(f"Sent study notification to {len(notifications)} users")
            return notifications
            
        except Exception as e:
            logger.error(f"Error sending study notification: {str(e)}")
            return []
    
    def send_chat_notification(self, room, sender, message_preview):
        """
        Send a notification for new chat messages
        """
        try:
            # Get all participants except the sender
            from chat.models import ChatParticipant
            participants = ChatParticipant.objects.filter(
                room=room,
                is_active=True,
                muted=False
            ).exclude(user=sender)
            
            notifications = []
            for participant in participants:
                # Check if user wants chat notifications
                if hasattr(participant.user, 'notification_preferences'):
                    prefs = participant.user.notification_preferences
                    if not prefs.chat_notifications:
                        continue
                
                notification = self.send_notification(
                    participant.user.id,
                    'chat_message',
                    f'New message in {room.name}',
                    f'{sender.get_full_name() or sender.username}: {message_preview}',
                    priority='normal',
                    action_url=f'/chat/room/{room.id}/',
                    data={
                        'room_id': str(room.id),
                        'room_name': room.name,
                        'sender_id': sender.id,
                        'sender_name': sender.get_full_name() or sender.username
                    }
                )
                if notification:
                    notifications.append(notification)
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error sending chat notification: {str(e)}")
            return []
    
    def send_upload_notification(self, user_id, status, filename, **kwargs):
        """
        Send a notification about file upload status
        """
        status_messages = {
            'completed': f'Upload completed: {filename}',
            'failed': f'Upload failed: {filename}',
            'processing': f'Processing upload: {filename}',
        }
        
        return self.send_notification(
            user_id,
            'upload_status',
            'Upload Status',
            status_messages.get(status, f'Upload {status}: {filename}'),
            priority='normal' if status == 'completed' else 'high',
            **kwargs
        )
    
    def send_ai_analysis_notification(self, study, analysis_result):
        """
        Send a notification when AI analysis is completed
        """
        try:
            title = f'AI Analysis Complete: {study.patient_name}'
            message = f'AI analysis completed for study {study.study_instance_uid[:16]}...'
            
            return self.send_study_notification(
                study,
                'ai_analysis_complete',
                title,
                message,
                priority='high',
                action_url=f'/ai/analysis/{study.id}/',
                data={
                    'study_id': study.id,
                    'analysis_id': analysis_result.get('id'),
                    'findings_count': len(analysis_result.get('findings', []))
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending AI analysis notification: {str(e)}")
            return []
    
    def send_system_error_notification(self, error_level, module, message, **kwargs):
        """
        Send a notification about system errors to administrators
        """
        try:
            # Send to superusers and staff
            admin_users = User.objects.filter(
                is_active=True,
                is_staff=True
            )
            
            notifications = []
            for user in admin_users:
                notification = self.send_notification(
                    user.id,
                    'system_error',
                    f'System {error_level.upper()}: {module}',
                    message,
                    priority='urgent' if error_level == 'critical' else 'high',
                    **kwargs
                )
                if notification:
                    notifications.append(notification)
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error sending system error notification: {str(e)}")
            return []


# Global notification service instance
notification_service = NotificationService()


def send_notification(user_id, notification_type, title, message, **kwargs):
    """Convenience function for sending notifications"""
    return notification_service.send_notification(
        user_id, notification_type, title, message, **kwargs
    )


def send_system_notification(notification_type, title, message, **kwargs):
    """Convenience function for sending system notifications"""
    return notification_service.send_system_notification(
        notification_type, title, message, **kwargs
    )