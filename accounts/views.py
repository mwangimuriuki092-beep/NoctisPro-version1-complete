"""
NoctisPro PACS - Accounts Views
Authentication, user management, and profile views
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.views.generic import View, ListView, DetailView, CreateView, UpdateView, DeleteView
from django.http import JsonResponse, HttpResponse
from django.db.models import Q, Count
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging
import pyotp
import qrcode
import io
import base64

from .models import User, Facility, UserPreferences, UserSession, UserActivity, PasswordResetToken
from .serializers import (
    UserSerializer, UserListSerializer, UserCreateSerializer, UserUpdateSerializer,
    FacilitySerializer, FacilityListSerializer, UserPreferencesSerializer,
    PasswordChangeSerializer, LoginSerializer
)
from .permissions import (
    IsAdmin, CanManageUsers, IsSameUserOrAdmin, IsSameFacilityOrAdmin
)


# =============================================================================
# AUTHENTICATION VIEWS
# =============================================================================

class LoginView(View):
    """User login view"""
    
    def get(self, request):
        """Show login form"""
        if request.user.is_authenticated:
            return redirect('worklist:dashboard')
        return render(request, 'accounts/login.html')
    
    def post(self, request):
        """Process login"""
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember_me = request.POST.get('remember_me')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:
                if not user.is_locked():
                    # Record successful login
                    ip_address = request.META.get('REMOTE_ADDR')
                    user.record_login_attempt(True, ip_address)
                    
                    # Login user
                    login(request, user)
                    
                    # Set session expiry
                    if not remember_me:
                        request.session.set_expiry(0)
                    
                    # Create session record
                    UserSession.objects.create(
                        user=user,
                        session_key=request.session.session_key,
                        ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
                    )
                    
                    # Log activity
                    UserActivity.objects.create(
                        user=user,
                        activity_type='login',
                        description=f'User logged in from {ip_address}',
                        ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
                    )
                    
                    messages.success(request, f'Welcome back, {user.get_display_name()}!')
                    
                    # Redirect to next or dashboard
                    next_url = request.GET.get('next', 'worklist:dashboard')
                    return redirect(next_url)
                else:
                    messages.error(request, 'Your account has been locked. Please contact administrator.')
            else:
                messages.error(request, 'Your account is inactive. Please contact administrator.')
        else:
            # Record failed login
            try:
                user = User.objects.get(username=username)
                user.record_login_attempt(False)
            except User.DoesNotExist:
                pass
            
            messages.error(request, 'Invalid username or password.')
        
        return render(request, 'accounts/login.html')


class LogoutView(LoginRequiredMixin, View):
    """User logout view"""
    
    def get(self, request):
        """Process logout"""
        # Terminate active session
        try:
            session = UserSession.objects.get(
                user=request.user,
                session_key=request.session.session_key,
                is_active=True
            )
            session.terminate()
        except UserSession.DoesNotExist:
            pass
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            activity_type='logout',
            description='User logged out',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        logout(request)
        messages.success(request, 'You have been logged out successfully.')
        return redirect('accounts:login')


class PasswordChangeView(LoginRequiredMixin, View):
    """Password change view"""
    
    def get(self, request):
        """Show password change form"""
        return render(request, 'accounts/password_change.html')
    
    def post(self, request):
        """Process password change"""
        old_password = request.POST.get('old_password')
        new_password = request.POST.get('new_password')
        confirm_password = request.POST.get('confirm_password')
        
        if not request.user.check_password(old_password):
            messages.error(request, 'Current password is incorrect.')
            return render(request, 'accounts/password_change.html')
        
        if new_password != confirm_password:
            messages.error(request, 'New passwords do not match.')
            return render(request, 'accounts/password_change.html')
        
        if len(new_password) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return render(request, 'accounts/password_change.html')
        
        # Change password
        request.user.set_password(new_password)
        request.user.password_changed_at = timezone.now()
        request.user.require_password_change = False
        request.user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, request.user)
        
        messages.success(request, 'Your password has been changed successfully.')
        return redirect('accounts:profile')


class PasswordResetRequestView(View):
    """Password reset request view"""
    
    def get(self, request):
        """Show password reset form"""
        return render(request, 'accounts/password_reset.html')
    
    def post(self, request):
        """Process password reset request"""
        email = request.POST.get('email')
        logger = logging.getLogger(__name__)
        
        try:
            user = User.objects.get(email=email, is_active=True)
            
            # Generate reset token
            reset_token = PasswordResetToken.generate_token(user, request)
            
            # Send reset email
            try:
                reset_url = request.build_absolute_uri(
                    f'/accounts/password-reset-confirm/{reset_token.token}/'
                )
                
                context = {
                    'user': user,
                    'reset_url': reset_url,
                    'token': reset_token.token,
                    'expires_at': reset_token.expires_at,
                    'site_name': getattr(settings, 'SITE_NAME', 'NoctisPro PACS'),
                }
                
                subject = f'Password Reset - {context["site_name"]}'
                message = render_to_string('accounts/password_reset_email.txt', context)
                html_message = render_to_string('accounts/password_reset_email.html', context)
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@noctispro.com'),
                    recipient_list=[user.email],
                    html_message=html_message,
                    fail_silently=False
                )
                
                logger.info(f"Password reset email sent to {user.email}")
                
            except Exception as e:
                logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
                # Still show success message for security
            
            messages.success(request, 'Password reset instructions have been sent to your email.')
            
        except User.DoesNotExist:
            # Don't reveal whether user exists - still show success message
            logger.info(f"Password reset attempted for non-existent email: {email}")
            messages.success(request, 'If an account exists with that email, password reset instructions have been sent.')
        
        return redirect('accounts:login')


class PasswordResetConfirmView(View):
    """Password reset confirmation view"""
    
    def get(self, request, token):
        """Show password reset confirmation form"""
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                messages.error(request, 'This password reset link has expired or has already been used.')
                return redirect('accounts:password_reset')
            
            context = {
                'token': token,
                'user': reset_token.user,
                'expires_at': reset_token.expires_at,
            }
            
            return render(request, 'accounts/password_reset_confirm.html', context)
            
        except PasswordResetToken.DoesNotExist:
            messages.error(request, 'Invalid password reset link.')
            return redirect('accounts:password_reset')
    
    def post(self, request, token):
        """Process password reset"""
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')
        logger = logging.getLogger(__name__)
        
        # Validate passwords
        if not password or not password_confirm:
            messages.error(request, 'Please enter both password fields.')
            return redirect('accounts:password_reset_confirm', token=token)
        
        if password != password_confirm:
            messages.error(request, 'Passwords do not match.')
            return redirect('accounts:password_reset_confirm', token=token)
        
        if len(password) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return redirect('accounts:password_reset_confirm', token=token)
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                messages.error(request, 'This password reset link has expired or has already been used.')
                return redirect('accounts:password_reset')
            
            # Reset password
            user = reset_token.user
            user.set_password(password)
            user.save()
            
            # Mark token as used
            reset_token.mark_used()
            
            # Log the password reset
            logger.info(f"Password reset completed for user {user.email}")
            
            # Create user activity record
            UserActivity.objects.create(
                user=user,
                activity_type='password_reset',
                description='Password reset via email token',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            messages.success(request, 'Your password has been reset successfully. You can now log in with your new password.')
            return redirect('accounts:login')
            
        except PasswordResetToken.DoesNotExist:
            messages.error(request, 'Invalid password reset link.')
            return redirect('accounts:password_reset')


# =============================================================================
# PROFILE VIEWS
# =============================================================================

class ProfileView(LoginRequiredMixin, View):
    """User profile view"""
    
    def get(self, request):
        """Show user profile"""
        context = {
            'user': request.user,
            'preferences': getattr(request.user, 'preferences', None),
            'recent_activity': UserActivity.objects.filter(user=request.user)[:10],
            'active_sessions': UserSession.objects.filter(user=request.user, is_active=True)
        }
        return render(request, 'accounts/profile.html', context)


class ProfileEditView(LoginRequiredMixin, View):
    """Edit user profile view"""
    
    def get(self, request):
        """Show profile edit form"""
        return render(request, 'accounts/profile_edit.html', {'user': request.user})
    
    def post(self, request):
        """Process profile update"""
        request.user.first_name = request.POST.get('first_name', '')
        request.user.last_name = request.POST.get('last_name', '')
        request.user.email = request.POST.get('email', '')
        request.user.phone = request.POST.get('phone', '')
        request.user.mobile = request.POST.get('mobile', '')
        request.user.bio = request.POST.get('bio', '')
        request.user.save()
        
        messages.success(request, 'Profile updated successfully.')
        return redirect('accounts:profile')


class AvatarUploadView(LoginRequiredMixin, View):
    """Upload user avatar"""
    
    def post(self, request):
        """Process avatar upload"""
        if 'avatar' in request.FILES:
            request.user.avatar = request.FILES['avatar']
            request.user.save()
            return JsonResponse({'success': True, 'avatar_url': request.user.avatar.url})
        return JsonResponse({'success': False, 'error': 'No file uploaded'}, status=400)


class SignatureUploadView(LoginRequiredMixin, View):
    """Upload user signature"""
    
    def post(self, request):
        """Process signature upload"""
        if 'signature' in request.FILES:
            request.user.signature = request.FILES['signature']
            request.user.save()
            return JsonResponse({'success': True, 'signature_url': request.user.signature.url})
        return JsonResponse({'success': False, 'error': 'No file uploaded'}, status=400)


# =============================================================================
# PREFERENCES VIEWS
# =============================================================================

class PreferencesView(LoginRequiredMixin, View):
    """User preferences view"""
    
    def get(self, request):
        """Show preferences"""
        preferences, created = UserPreferences.objects.get_or_create(user=request.user)
        return render(request, 'accounts/preferences.html', {'preferences': preferences})
    
    def post(self, request):
        """Update preferences"""
        preferences, created = UserPreferences.objects.get_or_create(user=request.user)
        
        # Update preferences from POST data
        category = request.POST.get('category')
        if category in ['dicom_viewer', 'dashboard', 'ui', 'notifications', 'worklist', 'report']:
            prefs_dict = getattr(preferences, f'{category}_preferences', {})
            for key, value in request.POST.items():
                if key != 'category' and key != 'csrfmiddlewaretoken':
                    prefs_dict[key] = value
            setattr(preferences, f'{category}_preferences', prefs_dict)
            preferences.save()
        
        messages.success(request, 'Preferences updated successfully.')
        return redirect('accounts:preferences')


class DicomViewerPreferencesView(LoginRequiredMixin, View):
    """DICOM viewer preferences"""
    
    def get(self, request):
        """Get viewer preferences"""
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        return JsonResponse({'preferences': preferences.dicom_viewer_preferences})
    
    def post(self, request):
        """Update viewer preferences"""
        import json
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        data = json.loads(request.body)
        preferences.dicom_viewer_preferences.update(data)
        preferences.save()
        return JsonResponse({'success': True})


class DashboardPreferencesView(LoginRequiredMixin, View):
    """Dashboard preferences"""
    
    def get(self, request):
        """Get dashboard preferences"""
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        return JsonResponse({'preferences': preferences.dashboard_preferences})
    
    def post(self, request):
        """Update dashboard preferences"""
        import json
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        data = json.loads(request.body)
        preferences.dashboard_preferences.update(data)
        preferences.save()
        return JsonResponse({'success': True})


class NotificationPreferencesView(LoginRequiredMixin, View):
    """Notification preferences"""
    
    def get(self, request):
        """Show notification preferences"""
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        return render(request, 'accounts/notification_preferences.html', {'preferences': preferences})
    
    def post(self, request):
        """Update notification preferences"""
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        preferences.notification_preferences = {
            'email_notifications': request.POST.get('email_notifications') == 'on',
            'push_notifications': request.POST.get('push_notifications') == 'on',
            'study_notifications': request.POST.get('study_notifications') == 'on',
            'report_notifications': request.POST.get('report_notifications') == 'on',
            'chat_notifications': request.POST.get('chat_notifications') == 'on',
        }
        preferences.save()
        messages.success(request, 'Notification preferences updated.')
        return redirect('accounts:preferences')


# =============================================================================
# SECURITY VIEWS
# =============================================================================

class SecuritySettingsView(LoginRequiredMixin, View):
    """Security settings view"""
    
    def get(self, request):
        """Show security settings"""
        context = {
            'user': request.user,
            'active_sessions': UserSession.objects.filter(user=request.user, is_active=True),
            'recent_activity': UserActivity.objects.filter(user=request.user)[:20]
        }
        return render(request, 'accounts/security.html', context)


class SessionManagementView(LoginRequiredMixin, View):
    """Session management view"""
    
    def get(self, request):
        """Show active sessions"""
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        return render(request, 'accounts/sessions.html', {'sessions': sessions})


class TerminateSessionView(LoginRequiredMixin, View):
    """Terminate specific session"""
    
    def post(self, request, session_id):
        """Terminate session"""
        try:
            session = UserSession.objects.get(id=session_id, user=request.user)
            session.terminate()
            messages.success(request, 'Session terminated successfully.')
        except UserSession.DoesNotExist:
            messages.error(request, 'Session not found.')
        
        return redirect('accounts:sessions')


class Enable2FAView(LoginRequiredMixin, View):
    """Enable two-factor authentication"""
    
    def get(self, request):
        """Show 2FA setup page"""
        if request.user.two_factor_enabled:
            messages.info(request, 'Two-factor authentication is already enabled.')
            return redirect('accounts:security')
        
        # Generate secret if not exists
        if not request.user.two_factor_secret:
            secret = pyotp.random_base32()
            request.user.two_factor_secret = secret
            request.user.save()
        else:
            secret = request.user.two_factor_secret
        
        # Generate TOTP URI
        totp = pyotp.TOTP(secret)
        site_name = getattr(settings, 'SITE_NAME', 'NoctisPro PACS')
        provisioning_uri = totp.provisioning_uri(
            name=request.user.email,
            issuer_name=site_name
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        context = {
            'secret': secret,
            'qr_code_data': qr_code_data,
            'provisioning_uri': provisioning_uri,
            'site_name': site_name,
        }
        
        return render(request, 'accounts/enable_2fa.html', context)
    
    def post(self, request):
        """Enable 2FA with verification"""
        verification_code = request.POST.get('verification_code')
        
        if not verification_code:
            messages.error(request, 'Please enter the verification code from your authenticator app.')
            return redirect('accounts:enable_2fa')
        
        if not request.user.two_factor_secret:
            messages.error(request, 'No 2FA secret found. Please try again.')
            return redirect('accounts:enable_2fa')
        
        # Verify the code
        totp = pyotp.TOTP(request.user.two_factor_secret)
        
        if totp.verify(verification_code, valid_window=1):
            request.user.two_factor_enabled = True
            request.user.save()
            
            # Log the activity
            UserActivity.objects.create(
                user=request.user,
                activity_type='2fa_enabled',
                description='Two-factor authentication enabled',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            messages.success(request, 'Two-factor authentication has been enabled successfully.')
            return redirect('accounts:security')
        else:
            messages.error(request, 'Invalid verification code. Please try again.')
            return redirect('accounts:enable_2fa')


class Disable2FAView(LoginRequiredMixin, View):
    """Disable two-factor authentication"""
    
    def post(self, request):
        """Disable 2FA with verification"""
        verification_code = request.POST.get('verification_code')
        password = request.POST.get('password')
        
        # Verify password first
        if not password or not request.user.check_password(password):
            messages.error(request, 'Invalid password. Please enter your current password to disable 2FA.')
            return redirect('accounts:security')
        
        # If 2FA is enabled, verify the code
        if request.user.two_factor_enabled and request.user.two_factor_secret:
            if not verification_code:
                messages.error(request, 'Please enter the verification code from your authenticator app.')
                return redirect('accounts:security')
            
            totp = pyotp.TOTP(request.user.two_factor_secret)
            if not totp.verify(verification_code, valid_window=1):
                messages.error(request, 'Invalid verification code.')
                return redirect('accounts:security')
        
        # Disable 2FA
        request.user.two_factor_enabled = False
        request.user.two_factor_secret = ''
        request.user.save()
        
        # Log the activity
        UserActivity.objects.create(
            user=request.user,
            activity_type='2fa_disabled',
            description='Two-factor authentication disabled',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            success=True
        )
        
        messages.success(request, 'Two-factor authentication has been disabled.')
        return redirect('accounts:security')


# =============================================================================
# ACTIVITY LOG VIEWS
# =============================================================================

class ActivityLogView(LoginRequiredMixin, View):
    """User activity log view"""
    
    def get(self, request):
        """Show activity log"""
        activities = UserActivity.objects.filter(user=request.user).order_by('-created_at')[:100]
        return render(request, 'accounts/activity_log.html', {'activities': activities})


# =============================================================================
# USER MANAGEMENT VIEWS (Admin/Manager only)
# =============================================================================

class UserListView(LoginRequiredMixin, ListView):
    """List all users"""
    model = User
    template_name = 'accounts/user_list.html'
    context_object_name = 'users'
    paginate_by = 50
    
    def get_queryset(self):
        """Filter users based on permissions"""
        queryset = User.objects.all()
        
        if self.request.user.is_admin():
            # Admins can see all users
            pass  # queryset already includes all users
        elif self.request.user.is_manager():
            # Managers can see users in their facility
            queryset = queryset.filter(facility=self.request.user.facility)
        else:
            # Regular users can only see themselves
            queryset = queryset.filter(id=self.request.user.id)
        
        # Search filter
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        # Role filter
        role = self.request.GET.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Status filter
        status_filter = self.request.GET.get('status')
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        return queryset.order_by('-created_at')


class UserDetailView(LoginRequiredMixin, DetailView):
    """View user details"""
    model = User
    template_name = 'accounts/user_detail.html'
    context_object_name = 'user_obj'
    pk_url_kwarg = 'user_id'


class UserCreateView(LoginRequiredMixin, View):
    """Create new user"""
    
    def get(self, request):
        """Show user creation form"""
        if not request.user.is_admin():
            messages.error(request, 'Only administrators can create users.')
            return redirect('accounts:user_list')
        
        facilities = Facility.objects.filter(is_active=True)
        return render(request, 'accounts/user_create.html', {'facilities': facilities})
    
    def post(self, request):
        """Create user"""
        if not request.user.is_admin():
            messages.error(request, 'Only administrators can create users.')
            return redirect('accounts:user_list')
        
        # Get form data
        email = request.POST.get('email', '').strip().lower()
        username = request.POST.get('username', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        password = request.POST.get('password', '')
        password_confirm = request.POST.get('password_confirm', '')
        role = request.POST.get('role', 'radiologist')
        facility_id = request.POST.get('facility')
        is_active = request.POST.get('is_active') == 'on'
        phone = request.POST.get('phone', '').strip()
        
        # Validation
        errors = []
        
        if not email:
            errors.append('Email is required.')
        elif User.objects.filter(email=email).exists():
            errors.append('A user with this email already exists.')
        
        if not username:
            errors.append('Username is required.')
        elif User.objects.filter(username=username).exists():
            errors.append('A user with this username already exists.')
        
        if not first_name:
            errors.append('First name is required.')
        
        if not last_name:
            errors.append('Last name is required.')
        
        if not password:
            errors.append('Password is required.')
        elif len(password) < 8:
            errors.append('Password must be at least 8 characters long.')
        elif password != password_confirm:
            errors.append('Passwords do not match.')
        
        if role not in ['admin', 'manager', 'radiologist', 'technologist', 'referring_physician']:
            errors.append('Invalid role selected.')
        
        facility = None
        if facility_id:
            try:
                facility = Facility.objects.get(id=facility_id, is_active=True)
            except Facility.DoesNotExist:
                errors.append('Invalid facility selected.')
        
        if errors:
            for error in errors:
                messages.error(request, error)
            facilities = Facility.objects.filter(is_active=True)
            context = {
                'facilities': facilities,
                'form_data': request.POST,
            }
            return render(request, 'accounts/user_create.html', context)
        
        try:
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                facility=facility,
                is_active=is_active,
                phone=phone,
                created_by=request.user
            )
            
            # Log the activity
            UserActivity.objects.create(
                user=request.user,
                activity_type='user_created',
                description=f'Created user: {user.email}',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            messages.success(request, f'User "{user.get_full_name()}" created successfully.')
            return redirect('accounts:user_detail', user_id=user.id)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating user: {str(e)}")
            messages.error(request, 'An error occurred while creating the user. Please try again.')
            
            facilities = Facility.objects.filter(is_active=True)
            context = {
                'facilities': facilities,
                'form_data': request.POST,
            }
            return render(request, 'accounts/user_create.html', context)


class UserEditView(LoginRequiredMixin, View):
    """Edit user"""
    
    def get(self, request, user_id):
        """Show user edit form"""
        user = get_object_or_404(User, id=user_id)
        
        if not request.user.can_manage_users():
            messages.error(request, 'You do not have permission to edit users.')
            return redirect('accounts:user_list')
        
        facilities = Facility.objects.filter(is_active=True)
        return render(request, 'accounts/user_edit.html', {
            'user_obj': user,
            'facilities': facilities
        })
    
    def post(self, request, user_id):
        """Update user"""
        user = get_object_or_404(User, id=user_id)
        
        # Allow users to edit their own profile, but only admins can edit other users
        if user != request.user and not request.user.is_admin():
            messages.error(request, 'Only administrators can edit other users.')
            return redirect('accounts:user_list')
        
        # Get form data
        email = request.POST.get('email', '').strip().lower()
        username = request.POST.get('username', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        role = request.POST.get('role', user.role)
        facility_id = request.POST.get('facility')
        is_active = request.POST.get('is_active') == 'on'
        phone = request.POST.get('phone', '').strip()
        
        # Optional password change
        new_password = request.POST.get('new_password', '')
        new_password_confirm = request.POST.get('new_password_confirm', '')
        
        # Validation
        errors = []
        
        if not email:
            errors.append('Email is required.')
        elif User.objects.filter(email=email).exclude(id=user.id).exists():
            errors.append('A user with this email already exists.')
        
        if not username:
            errors.append('Username is required.')
        elif User.objects.filter(username=username).exclude(id=user.id).exists():
            errors.append('A user with this username already exists.')
        
        if not first_name:
            errors.append('First name is required.')
        
        if not last_name:
            errors.append('Last name is required.')
        
        if role not in ['admin', 'manager', 'radiologist', 'technologist', 'referring_physician']:
            errors.append('Invalid role selected.')
        
        # Password validation (only if changing password)
        if new_password or new_password_confirm:
            if len(new_password) < 8:
                errors.append('New password must be at least 8 characters long.')
            elif new_password != new_password_confirm:
                errors.append('New passwords do not match.')
        
        facility = None
        if facility_id:
            try:
                facility = Facility.objects.get(id=facility_id, is_active=True)
            except Facility.DoesNotExist:
                errors.append('Invalid facility selected.')
        
        if errors:
            for error in errors:
                messages.error(request, error)
            facilities = Facility.objects.filter(is_active=True)
            context = {
                'user_obj': user,
                'facilities': facilities,
                'form_data': request.POST,
            }
            return render(request, 'accounts/user_edit.html', context)
        
        try:
            # Track changes for logging
            changes = []
            
            if user.email != email:
                changes.append(f'email: {user.email} → {email}')
                user.email = email
            
            if user.username != username:
                changes.append(f'username: {user.username} → {username}')
                user.username = username
            
            if user.first_name != first_name:
                changes.append(f'first_name: {user.first_name} → {first_name}')
                user.first_name = first_name
            
            if user.last_name != last_name:
                changes.append(f'last_name: {user.last_name} → {last_name}')
                user.last_name = last_name
            
            if user.role != role:
                changes.append(f'role: {user.role} → {role}')
                user.role = role
            
            if user.facility != facility:
                old_facility = user.facility.name if user.facility else 'None'
                new_facility = facility.name if facility else 'None'
                changes.append(f'facility: {old_facility} → {new_facility}')
                user.facility = facility
            
            if user.is_active != is_active:
                changes.append(f'is_active: {user.is_active} → {is_active}')
                user.is_active = is_active
            
            if user.phone != phone:
                changes.append(f'phone: {user.phone} → {phone}')
                user.phone = phone
            
            # Change password if provided
            if new_password:
                user.set_password(new_password)
                changes.append('password: changed')
            
            user.save()
            
            # Log the activity
            if changes:
                UserActivity.objects.create(
                    user=request.user,
                    activity_type='user_updated',
                    description=f'Updated user {user.email}: {", ".join(changes)}',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True
                )
            
            messages.success(request, f'User "{user.get_full_name()}" updated successfully.')
            return redirect('accounts:user_detail', user_id=user_id)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating user {user_id}: {str(e)}")
            messages.error(request, 'An error occurred while updating the user. Please try again.')
            
            facilities = Facility.objects.filter(is_active=True)
            context = {
                'user_obj': user,
                'facilities': facilities,
                'form_data': request.POST,
            }
            return render(request, 'accounts/user_edit.html', context)


class UserDeleteView(LoginRequiredMixin, View):
    """Delete user"""
    
    def post(self, request, user_id):
        """Delete user"""
        user = get_object_or_404(User, id=user_id)
        
        if not request.user.is_admin():
            messages.error(request, 'Only administrators can delete users.')
            return redirect('accounts:user_list')
        
        # Prevent admin from deleting themselves
        if user == request.user:
            messages.error(request, 'You cannot delete your own account.')
            return redirect('accounts:user_list')
        
        user.is_active = False
        user.save()
        messages.success(request, 'User deactivated successfully.')
        return redirect('accounts:user_list')


class UserActivateView(LoginRequiredMixin, View):
    """Activate user"""
    
    def post(self, request, user_id):
        """Activate user"""
        user = get_object_or_404(User, id=user_id)
        
        if not request.user.can_manage_users():
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        
        user.is_active = True
        user.save()
        return JsonResponse({'success': True})


class UserDeactivateView(LoginRequiredMixin, View):
    """Deactivate user"""
    
    def post(self, request, user_id):
        """Deactivate user"""
        user = get_object_or_404(User, id=user_id)
        
        if not request.user.can_manage_users():
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        
        if user == request.user:
            return JsonResponse({'success': False, 'error': 'Cannot deactivate yourself'}, status=400)
        
        user.is_active = False
        user.save()
        return JsonResponse({'success': True})


class UserPermissionsView(LoginRequiredMixin, View):
    """Manage user permissions"""
    
    def get(self, request, user_id):
        """Show user permissions"""
        user = get_object_or_404(User, id=user_id)
        
        if not request.user.can_manage_users():
            messages.error(request, 'You do not have permission to manage permissions.')
            return redirect('accounts:user_list')
        
        return render(request, 'accounts/user_permissions.html', {'user_obj': user})


# =============================================================================
# FACILITY MANAGEMENT VIEWS
# =============================================================================

class FacilityListView(LoginRequiredMixin, ListView):
    """List all facilities"""
    model = Facility
    template_name = 'accounts/facility_list.html'
    context_object_name = 'facilities'
    paginate_by = 50
    
    def get_queryset(self):
        """Get facilities"""
        if self.request.user.is_admin():
            return Facility.objects.all().order_by('name')
        return Facility.objects.filter(id=self.request.user.facility_id)


class FacilityDetailView(LoginRequiredMixin, DetailView):
    """View facility details"""
    model = Facility
    template_name = 'accounts/facility_detail.html'
    context_object_name = 'facility'
    pk_url_kwarg = 'facility_id'


class FacilityCreateView(LoginRequiredMixin, View):
    """Create new facility"""
    
    def get(self, request):
        """Show facility creation form"""
        if not request.user.is_admin():
            messages.error(request, 'Only administrators can create facilities.')
            return redirect('accounts:facility_list')
        
        return render(request, 'accounts/facility_create.html')
    
    def post(self, request):
        """Create facility"""
        if not request.user.is_admin():
            messages.error(request, 'Only administrators can create facilities.')
            return redirect('accounts:facility_list')
        
        # Get form data
        name = request.POST.get('name', '').strip()
        code = request.POST.get('code', '').strip().upper()
        address = request.POST.get('address', '').strip()
        city = request.POST.get('city', '').strip()
        state = request.POST.get('state', '').strip()
        zip_code = request.POST.get('zip_code', '').strip()
        country = request.POST.get('country', 'USA').strip()
        phone = request.POST.get('phone', '').strip()
        email = request.POST.get('email', '').strip().lower()
        website = request.POST.get('website', '').strip()
        license_number = request.POST.get('license_number', '').strip()
        accreditation = request.POST.get('accreditation', '').strip()
        facility_type = request.POST.get('facility_type', 'hospital')
        is_active = request.POST.get('is_active') == 'on'
        
        # Validation
        errors = []
        
        if not name:
            errors.append('Facility name is required.')
        elif Facility.objects.filter(name=name).exists():
            errors.append('A facility with this name already exists.')
        
        if not code:
            errors.append('Facility code is required.')
        elif Facility.objects.filter(code=code).exists():
            errors.append('A facility with this code already exists.')
        elif len(code) < 2 or len(code) > 20:
            errors.append('Facility code must be between 2 and 20 characters.')
        
        if not address:
            errors.append('Address is required.')
        
        if not phone:
            errors.append('Phone number is required.')
        
        if not email:
            errors.append('Email is required.')
        elif Facility.objects.filter(email=email).exists():
            errors.append('A facility with this email already exists.')
        
        if not license_number:
            errors.append('License number is required.')
        elif Facility.objects.filter(license_number=license_number).exists():
            errors.append('A facility with this license number already exists.')
        
        if facility_type not in ['hospital', 'clinic', 'imaging_center', 'research_facility', 'mobile_unit']:
            errors.append('Invalid facility type selected.')
        
        if errors:
            for error in errors:
                messages.error(request, error)
            context = {
                'form_data': request.POST,
            }
            return render(request, 'accounts/facility_create.html', context)
        
        try:
            # Create facility
            facility = Facility.objects.create(
                name=name,
                code=code,
                address=address,
                city=city,
                state=state,
                zip_code=zip_code,
                country=country,
                phone=phone,
                email=email,
                website=website,
                license_number=license_number,
                accreditation=accreditation,
                facility_type=facility_type,
                is_active=is_active,
                created_by=request.user
            )
            
            # Log the activity
            UserActivity.objects.create(
                user=request.user,
                activity_type='facility_created',
                description=f'Created facility: {facility.name} ({facility.code})',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=True
            )
            
            messages.success(request, f'Facility "{facility.name}" created successfully.')
            return redirect('accounts:facility_detail', facility_id=facility.id)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating facility: {str(e)}")
            messages.error(request, 'An error occurred while creating the facility. Please try again.')
            
            context = {
                'form_data': request.POST,
            }
            return render(request, 'accounts/facility_create.html', context)


class FacilityEditView(LoginRequiredMixin, View):
    """Edit facility"""
    
    def get(self, request, facility_id):
        """Show facility edit form"""
        facility = get_object_or_404(Facility, id=facility_id)
        
        if not request.user.is_admin():
            messages.error(request, 'Only administrators can edit facilities.')
            return redirect('accounts:facility_list')
        
        return render(request, 'accounts/facility_edit.html', {'facility': facility})


class FacilityDeleteView(LoginRequiredMixin, View):
    """Delete facility"""
    
    def post(self, request, facility_id):
        """Delete facility"""
        facility = get_object_or_404(Facility, id=facility_id)
        
        if not request.user.is_admin():
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        
        facility.is_active = False
        facility.save()
        return JsonResponse({'success': True})


class FacilityUsersView(LoginRequiredMixin, View):
    """View facility users"""
    
    def get(self, request, facility_id):
        """Show facility users"""
        facility = get_object_or_404(Facility, id=facility_id)
        users = User.objects.filter(facility=facility)
        return render(request, 'accounts/facility_users.html', {
            'facility': facility,
            'users': users
        })


# =============================================================================
# API VIEWS
# =============================================================================

class CheckUsernameView(View):
    """Check if username is available"""
    
    def get(self, request):
        """Check username"""
        username = request.GET.get('username')
        exists = User.objects.filter(username=username).exists()
        return JsonResponse({'available': not exists})


class CheckEmailView(View):
    """Check if email is available"""
    
    def get(self, request):
        """Check email"""
        email = request.GET.get('email')
        exists = User.objects.filter(email=email).exists()
        return JsonResponse({'available': not exists})


class UserSearchView(LoginRequiredMixin, View):
    """Search users"""
    
    def get(self, request):
        """Search users"""
        query = request.GET.get('q', '')
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).filter(is_active=True)[:10]
        
        results = [{
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name(),
            'email': user.email,
            'role': user.get_role_display()
        } for user in users]
        
        return JsonResponse({'results': results})


# Placeholder views - implement as needed
class RegisterView(View):
    def get(self, request):
        return render(request, 'accounts/register.html')
    
    def post(self, request):
        messages.info(request, 'Registration is currently disabled. Please contact administrator.')
        return redirect('accounts:login')


class VerifyEmailView(View):
    def get(self, request, token):
        messages.success(request, 'Email verified successfully.')
        return redirect('accounts:login')
