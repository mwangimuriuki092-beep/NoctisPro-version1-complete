"""
NoctisPro PACS - Accounts Serializers
API serializers for user and facility management
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, Facility, UserPreferences, UserSession, UserActivity


class FacilitySerializer(serializers.ModelSerializer):
    """Serializer for Facility model"""
    
    user_count = serializers.SerializerMethodField()
    study_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'code', 'address', 'city', 'state', 'zip_code', 
            'country', 'phone', 'email', 'website', 'license_number',
            'accreditation_number', 'tax_id', 'ae_title', 'dicom_port',
            'logo', 'letterhead', 'timezone', 'default_modalities', 'settings',
            'is_active', 'is_verified', 'subscription_tier', 'created_at',
            'updated_at', 'user_count', 'study_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_count', 'study_count']
    
    def get_user_count(self, obj):
        """Get number of users in facility"""
        return obj.users.filter(is_active=True).count()
    
    def get_study_count(self, obj):
        """Get number of studies in facility"""
        return obj.study_set.count() if hasattr(obj, 'study_set') else 0


class FacilityListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for facility lists"""
    
    class Meta:
        model = Facility
        fields = ['id', 'name', 'code', 'is_active', 'subscription_tier']


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user preferences"""
    
    class Meta:
        model = UserPreferences
        fields = [
            'dicom_viewer_preferences', 'dashboard_preferences',
            'ui_preferences', 'notification_preferences',
            'worklist_preferences', 'report_preferences',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_name', 'session_key', 'ip_address',
            'user_agent', 'device_type', 'browser', 'os', 'location',
            'is_active', 'login_time', 'last_activity', 'logout_time'
        ]
        read_only_fields = ['id', 'login_time', 'last_activity', 'logout_time']


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user activity"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    activity_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'user_name', 'activity_type', 'activity_display',
            'description', 'ip_address', 'user_agent', 'object_type',
            'object_id', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for User model"""
    
    facility_name = serializers.CharField(source='facility.name', read_only=True, allow_null=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.SerializerMethodField()
    preferences = UserPreferencesSerializer(read_only=True)
    is_locked = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'facility', 'facility_name',
            'phone', 'mobile', 'license_number', 'specialization', 'title',
            'department', 'avatar', 'bio', 'signature',
            'is_verified', 'email_verified', 'phone_verified',
            'last_login', 'last_login_ip', 'last_login_location',
            'last_activity', 'is_active', 'is_staff', 'is_superuser',
            'two_factor_enabled', 'language', 'timezone',
            'notifications_enabled', 'created_at', 'updated_at',
            'preferences', 'is_locked'
        ]
        read_only_fields = [
            'id', 'last_login', 'last_login_ip', 'last_login_location',
            'created_at', 'updated_at', 'is_locked'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'avatar': {'required': False},
            'signature': {'required': False},
        }
    
    def get_full_name(self, obj):
        """Get user's full name"""
        return obj.get_full_name() or obj.username
    
    def get_is_locked(self, obj):
        """Check if user is locked"""
        return obj.is_locked()


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user lists"""
    
    facility_name = serializers.CharField(source='facility.name', read_only=True, allow_null=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'facility', 'facility_name',
            'is_active', 'is_verified', 'last_activity'
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users"""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'facility',
            'phone', 'license_number', 'specialization', 'title', 'department'
        ]
    
    def validate(self, attrs):
        """Validate passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information"""
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'phone', 'mobile',
            'license_number', 'specialization', 'title', 'department',
            'bio', 'language', 'timezone', 'notifications_enabled'
        ]


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate_old_password(self, value):
        """Validate old password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
    
    def validate(self, attrs):
        """Validate new passwords match"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs
    
    def save(self):
        """Change password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.password_changed_at = timezone.now()
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login"""
    
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    remember_me = serializers.BooleanField(default=False)


class UserStatisticsSerializer(serializers.Serializer):
    """Serializer for user statistics"""
    
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    verified_users = serializers.IntegerField()
    users_by_role = serializers.DictField()
    users_by_facility = serializers.DictField()
    recent_logins = serializers.IntegerField()


from django.utils import timezone
