from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('preferences/', views.user_preferences_view, name='preferences'),
    path('api/preferences/', views.preferences_api, name='preferences_api'),
    path('api/check-session/', views.check_session, name='check_session'),
    path('api/user-info/', views.user_api_info, name='user_api_info'),
    path('extend-session/', views.extend_session, name='extend_session'),
    path('session-status/', views.session_status, name='session_status'),
]