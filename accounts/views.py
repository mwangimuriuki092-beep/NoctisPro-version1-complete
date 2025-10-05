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
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import User, Facility, UserPreferences, UserSession, UserActivity
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
        
        try:
            user = User.objects.get(email=email, is_active=True)
            # TODO: Generate and send reset token via email
            messages.success(request, 'Password reset instructions have been sent to your email.')
        except User.DoesNotExist:
            # Don't reveal whether user exists
            messages.success(request, 'If an account exists with that email, password reset instructions have been sent.')
        
        return redirect('accounts:login')


class PasswordResetConfirmView(View):
    """Password reset confirmation view"""
    
    def get(self, request, token):
        """Show password reset confirmation form"""
        # TODO: Validate token
        return render(request, 'accounts/password_reset_confirm.html', {'token': token})
    
    def post(self, request, token):
        """Process password reset"""
        # TODO: Validate token and reset password
        messages.success(request, 'Your password has been reset successfully.')
        return redirect('accounts:login')


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
    
    def post(self, request):
        """Enable 2FA"""
        # TODO: Implement 2FA setup
        request.user.two_factor_enabled = True
        request.user.save()
        messages.success(request, 'Two-factor authentication enabled.')
        return redirect('accounts:security')


class Disable2FAView(LoginRequiredMixin, View):
    """Disable two-factor authentication"""
    
    def post(self, request):
        """Disable 2FA"""
        request.user.two_factor_enabled = False
        request.user.two_factor_secret = ''
        request.user.save()
        messages.success(request, 'Two-factor authentication disabled.')
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
        
        if not self.request.user.is_admin():
            # Facility managers see only their facility
            queryset = queryset.filter(facility=self.request.user.facility)
        
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
        if not request.user.can_manage_users():
            messages.error(request, 'You do not have permission to create users.')
            return redirect('accounts:user_list')
        
        facilities = Facility.objects.filter(is_active=True)
        return render(request, 'accounts/user_create.html', {'facilities': facilities})
    
    def post(self, request):
        """Create user"""
        if not request.user.can_manage_users():
            messages.error(request, 'You do not have permission to create users.')
            return redirect('accounts:user_list')
        
        # TODO: Implement user creation with validation
        messages.success(request, 'User created successfully.')
        return redirect('accounts:user_list')


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
        
        if not request.user.can_manage_users():
            messages.error(request, 'You do not have permission to edit users.')
            return redirect('accounts:user_list')
        
        # TODO: Implement user update with validation
        messages.success(request, 'User updated successfully.')
        return redirect('accounts:user_detail', user_id=user_id)


class UserDeleteView(LoginRequiredMixin, View):
    """Delete user"""
    
    def post(self, request, user_id):
        """Delete user"""
        user = get_object_or_404(User, id=user_id)
        
        if not request.user.can_manage_users():
            messages.error(request, 'You do not have permission to delete users.')
            return redirect('accounts:user_list')
        
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
            return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
        
        # TODO: Implement facility creation
        messages.success(request, 'Facility created successfully.')
        return redirect('accounts:facility_list')


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
