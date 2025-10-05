"""
NoctisPro PACS - Worklist Serializers
API serializers for patient and study management
"""

from rest_framework import serializers
from django.utils import timezone
from .models import (
    Patient, Modality, Study, Series, DicomImage,
    StudyAttachment, StudyNote
)
from accounts.models import User, Facility


class ModalitySerializer(serializers.ModelSerializer):
    """Serializer for Modality model"""
    
    class Meta:
        model = Modality
        fields = [
            'id', 'code', 'name', 'description', 'default_body_parts',
            'typical_procedures', 'base_price', 'is_active',
            'display_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ModalityListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for modality lists"""
    
    class Meta:
        model = Modality
        fields = ['id', 'code', 'name', 'is_active']


class PatientSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for Patient model"""
    
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    studies_count = serializers.SerializerMethodField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'medical_record_number',
            'first_name', 'last_name', 'middle_name', 'full_name',
            'date_of_birth', 'age', 'gender', 'gender_display',
            'phone', 'email', 'address', 'city', 'state', 'zip_code', 'country',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
            'insurance_provider', 'insurance_policy_number',
            'allergies', 'medical_history', 'notes',
            'is_anonymized', 'consent_for_research',
            'created_at', 'updated_at', 'studies_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name', 'age']
    
    def get_studies_count(self, obj):
        """Get number of studies"""
        return obj.get_studies_count()


class PatientListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for patient lists"""
    
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'full_name', 'date_of_birth', 'age',
            'gender', 'gender_display', 'phone', 'email'
        ]


class DicomImageSerializer(serializers.ModelSerializer):
    """Serializer for DICOM images"""
    
    file_size_mb = serializers.SerializerMethodField()
    series_number = serializers.IntegerField(source='series.series_number', read_only=True)
    
    class Meta:
        model = DicomImage
        fields = [
            'id', 'sop_instance_uid', 'sop_class_uid', 'series', 'series_number',
            'instance_number', 'image_position', 'slice_location',
            'image_orientation', 'rows', 'columns', 'bits_allocated',
            'bits_stored', 'photometric_interpretation',
            'window_center', 'window_width', 'file_path', 'file_size',
            'file_size_mb', 'thumbnail', 'preview', 'processed',
            'thumbnail_generated', 'preview_generated',
            'has_pixel_data', 'is_corrupted', 'acquisition_datetime',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'file_size_mb']
    
    def get_file_size_mb(self, obj):
        """Get file size in MB"""
        return obj.get_file_size_mb()


class DicomImageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for image lists"""
    
    class Meta:
        model = DicomImage
        fields = [
            'id', 'sop_instance_uid', 'instance_number',
            'slice_location', 'thumbnail', 'processed'
        ]


class SeriesSerializer(serializers.ModelSerializer):
    """Serializer for DICOM series"""
    
    images = DicomImageListSerializer(many=True, read_only=True)
    image_count = serializers.SerializerMethodField()
    study_accession = serializers.CharField(source='study.accession_number', read_only=True)
    
    class Meta:
        model = Series
        fields = [
            'id', 'series_instance_uid', 'study', 'study_accession',
            'series_number', 'series_description', 'modality',
            'body_part', 'laterality', 'patient_position',
            'protocol_name', 'sequence_name', 'slice_thickness',
            'pixel_spacing', 'image_orientation', 'rows', 'columns',
            'number_of_instances', 'series_date', 'series_time',
            'manufacturer', 'manufacturer_model', 'station_name',
            'is_processed', 'has_3d_volume', 'created_at', 'updated_at',
            'images', 'image_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'image_count']
    
    def get_image_count(self, obj):
        """Get image count"""
        return obj.get_image_count()


class SeriesListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for series lists"""
    
    class Meta:
        model = Series
        fields = [
            'id', 'series_instance_uid', 'series_number',
            'series_description', 'modality', 'number_of_instances'
        ]


class StudyAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for study attachments"""
    
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_extension = serializers.SerializerMethodField()
    
    class Meta:
        model = StudyAttachment
        fields = [
            'id', 'study', 'file', 'file_type', 'name', 'description',
            'file_size', 'mime_type', 'thumbnail', 'attached_study',
            'study_date', 'modality', 'page_count', 'author',
            'creation_date', 'is_public', 'allowed_roles', 'version',
            'replaced_by', 'is_current_version', 'uploaded_by',
            'uploaded_by_name', 'upload_date', 'last_accessed',
            'access_count', 'file_extension'
        ]
        read_only_fields = [
            'id', 'upload_date', 'last_accessed', 'access_count',
            'file_extension'
        ]
    
    def get_file_extension(self, obj):
        """Get file extension"""
        return obj.get_file_extension()


class StudyNoteSerializer(serializers.ModelSerializer):
    """Serializer for study notes"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)
    
    class Meta:
        model = StudyNote
        fields = [
            'id', 'study', 'user', 'user_name', 'note', 'note_type',
            'note_type_display', 'is_private', 'is_important',
            'created_at', 'updated_at', 'edited_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']


class StudySerializer(serializers.ModelSerializer):
    """Comprehensive serializer for Study model"""
    
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    modality_name = serializers.CharField(source='modality.name', read_only=True)
    radiologist_name = serializers.CharField(source='radiologist.username', read_only=True, allow_null=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    series = SeriesListSerializer(many=True, read_only=True, source='series_set')
    attachments = StudyAttachmentSerializer(many=True, read_only=True)
    notes = StudyNoteSerializer(many=True, read_only=True)
    
    series_count = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Study
        fields = [
            'id', 'study_instance_uid', 'accession_number', 'study_id',
            'patient', 'patient_name', 'facility', 'facility_name',
            'modality', 'modality_name', 'study_description', 'study_date',
            'study_time', 'referring_physician', 'referring_physician_phone',
            'performing_physician', 'radiologist', 'radiologist_name',
            'body_part', 'procedure_code', 'laterality', 'clinical_info',
            'clinical_history', 'indications', 'study_comments',
            'status', 'status_display', 'priority', 'priority_display',
            'is_verified', 'verified_by', 'verified_at',
            'is_urgent', 'is_stat', 'is_critical', 'requires_comparison',
            'number_of_series', 'number_of_instances', 'storage_size',
            'uploaded_by', 'uploaded_by_name', 'upload_date', 'last_updated',
            'last_accessed', 'access_count', 'series', 'attachments', 'notes',
            'series_count', 'image_count'
        ]
        read_only_fields = [
            'id', 'upload_date', 'last_updated', 'last_accessed',
            'access_count', 'series_count', 'image_count'
        ]
    
    def get_series_count(self, obj):
        """Get series count"""
        return obj.get_series_count()
    
    def get_image_count(self, obj):
        """Get image count"""
        return obj.get_image_count()


class StudyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for study lists"""
    
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    modality_code = serializers.CharField(source='modality.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Study
        fields = [
            'id', 'accession_number', 'patient', 'patient_name',
            'facility', 'facility_name', 'modality', 'modality_code',
            'study_description', 'study_date', 'status', 'status_display',
            'priority', 'is_urgent', 'is_stat', 'is_critical',
            'number_of_series', 'number_of_instances'
        ]


class StudyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating studies"""
    
    class Meta:
        model = Study
        fields = [
            'study_instance_uid', 'accession_number', 'study_id',
            'patient', 'facility', 'modality', 'study_description',
            'study_date', 'study_time', 'referring_physician',
            'referring_physician_phone', 'performing_physician',
            'body_part', 'procedure_code', 'laterality',
            'clinical_info', 'clinical_history', 'indications',
            'study_comments', 'priority'
        ]
    
    def create(self, validated_data):
        """Create study with uploaded_by"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class StudyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating studies"""
    
    class Meta:
        model = Study
        fields = [
            'study_description', 'referring_physician',
            'referring_physician_phone', 'performing_physician',
            'radiologist', 'body_part', 'procedure_code', 'laterality',
            'clinical_info', 'clinical_history', 'indications',
            'study_comments', 'status', 'priority',
            'is_urgent', 'is_stat', 'is_critical', 'requires_comparison'
        ]


class StudyStatisticsSerializer(serializers.Serializer):
    """Serializer for study statistics"""
    
    total_studies = serializers.IntegerField()
    studies_by_status = serializers.DictField()
    studies_by_modality = serializers.DictField()
    studies_by_priority = serializers.DictField()
    urgent_studies = serializers.IntegerField()
    stat_studies = serializers.IntegerField()
    critical_studies = serializers.IntegerField()
    total_images = serializers.IntegerField()
    total_series = serializers.IntegerField()
    storage_used = serializers.IntegerField()
