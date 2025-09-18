"""
Management command to test real-time notifications
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from notifications.services import notification_service
import time

User = get_user_model()


class Command(BaseCommand):
    help = 'Test real-time notifications system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to send test notifications to'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Number of test notifications to send'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=2,
            help='Interval between notifications in seconds'
        )
    
    def handle(self, *args, **options):
        user_id = options.get('user_id')
        count = options['count']
        interval = options['interval']
        
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                self.stdout.write(f'Sending {count} test notifications to user: {user.username}')
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User with ID {user_id} not found'))
                return
        else:
            # Get first active user
            user = User.objects.filter(is_active=True).first()
            if not user:
                self.stdout.write(self.style.ERROR('No active users found'))
                return
            user_id = user.id
            self.stdout.write(f'Sending {count} test notifications to first active user: {user.username}')
        
        # Test different notification types
        notification_types = [
            ('info', 'Test Information', 'This is a test information notification'),
            ('success', 'Test Success', 'This is a test success notification'),
            ('warning', 'Test Warning', 'This is a test warning notification'),
            ('error', 'Test Error', 'This is a test error notification'),
            ('system', 'System Test', 'This is a test system notification'),
        ]
        
        for i in range(count):
            notification_type, title, message = notification_types[i % len(notification_types)]
            
            self.stdout.write(f'Sending notification {i+1}/{count}: {title}')
            
            notification = notification_service.send_notification(
                user_id=user_id,
                notification_type=notification_type,
                title=f'{title} #{i+1}',
                message=f'{message} (Test #{i+1})',
                priority='normal',
                data={'test_id': i+1, 'timestamp': time.time()}
            )
            
            if notification:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Sent notification: {notification.title}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to send notification #{i+1}')
                )
            
            if i < count - 1:  # Don't wait after the last notification
                time.sleep(interval)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Test completed! Sent {count} notifications to user {user.username}')
        )
        
        # Test system notification
        self.stdout.write('\nSending system notification to all users...')
        notifications = notification_service.send_system_notification(
            'system_test',
            'System Test Notification',
            'This is a test system notification sent to all active users'
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Sent system notification to {len(notifications)} users')
        )