"""
NoctisPro PACS - Accounts URLs
Authentication, user management, and profile endpoints
"""

from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('password/change/', views.PasswordChangeView.as_view(), name='password_change'),
    path('password/reset/', views.PasswordResetRequestView.as_view(), name='password_reset'),
    path('password/reset/<str:token>/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Registration (if enabled)
    path('register/', views.RegisterView.as_view(), name='register'),
    path('verify/<str:token>/', views.VerifyEmailView.as_view(), name='verify_email'),
    
    # Profile Management
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/edit/', views.ProfileEditView.as_view(), name='profile_edit'),
    path('profile/avatar/', views.AvatarUploadView.as_view(), name='avatar_upload'),
    path('profile/signature/', views.SignatureUploadView.as_view(), name='signature_upload'),
    
    # User Preferences
    path('preferences/', views.PreferencesView.as_view(), name='preferences'),
    path('preferences/dicom-viewer/', views.DicomViewerPreferencesView.as_view(), name='dicom_viewer_preferences'),
    path('preferences/dashboard/', views.DashboardPreferencesView.as_view(), name='dashboard_preferences'),
    path('preferences/notifications/', views.NotificationPreferencesView.as_view(), name='notification_preferences'),
    
    # Security
    path('security/', views.SecuritySettingsView.as_view(), name='security'),
    path('security/sessions/', views.SessionManagementView.as_view(), name='sessions'),
    path('security/sessions/<int:session_id>/terminate/', views.TerminateSessionView.as_view(), name='terminate_session'),
    path('security/two-factor/enable/', views.Enable2FAView.as_view(), name='enable_2fa'),
    path('security/two-factor/disable/', views.Disable2FAView.as_view(), name='disable_2fa'),
    
    # Activity Log
    path('activity/', views.ActivityLogView.as_view(), name='activity_log'),
    
    # User Management (Admin/Manager only)
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/create/', views.UserCreateView.as_view(), name='user_create'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<int:user_id>/edit/', views.UserEditView.as_view(), name='user_edit'),
    path('users/<int:user_id>/delete/', views.UserDeleteView.as_view(), name='user_delete'),
    path('users/<int:user_id>/activate/', views.UserActivateView.as_view(), name='user_activate'),
    path('users/<int:user_id>/deactivate/', views.UserDeactivateView.as_view(), name='user_deactivate'),
    path('users/<int:user_id>/permissions/', views.UserPermissionsView.as_view(), name='user_permissions'),
    
    # Facility Management (Admin only)
    path('facilities/', views.FacilityListView.as_view(), name='facility_list'),
    path('facilities/create/', views.FacilityCreateView.as_view(), name='facility_create'),
    path('facilities/<int:facility_id>/', views.FacilityDetailView.as_view(), name='facility_detail'),
    path('facilities/<int:facility_id>/edit/', views.FacilityEditView.as_view(), name='facility_edit'),
    path('facilities/<int:facility_id>/delete/', views.FacilityDeleteView.as_view(), name='facility_delete'),
    path('facilities/<int:facility_id>/users/', views.FacilityUsersView.as_view(), name='facility_users'),
    
    # API Endpoints
    path('api/check-username/', views.CheckUsernameView.as_view(), name='api_check_username'),
    path('api/check-email/', views.CheckEmailView.as_view(), name='api_check_email'),
    path('api/user-search/', views.UserSearchView.as_view(), name='api_user_search'),
]
