"""
NoctisPro PACS - Worklist Models
Optimized patient and study management with enhanced metadata
"""

from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from accounts.models import User, Facility
import os
import uuid


class Patient(models.Model):
    """Patient information model with enhanced privacy and validation"""
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('U', 'Unknown'),
    ]
    
    # Primary Identifiers
    patient_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique patient identifier"
    )
    medical_record_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text="Medical record number (MRN)"
    )
    
    # Demographics
    first_name = models.CharField(max_length=100, db_index=True)
    last_name = models.CharField(max_length=100, db_index=True)
    middle_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(db_index=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    
    # Contact Information
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be valid format"
        )]
    )
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='USA')
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True)
    
    # Additional Information
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    allergies = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Privacy
    is_anonymized = models.BooleanField(default=False)
    consent_for_research = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['patient_id']),
            models.Index(fields=['medical_record_number']),
            models.Index(fields=['date_of_birth']),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.patient_id})"

    @property
    def full_name(self):
        """Get patient's full name"""
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(filter(None, parts))
    
    @property
    def age(self):
        """Calculate patient's age"""
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
    
    def get_studies_count(self):
        """Get number of studies for this patient"""
        return self.study_set.count()


class Modality(models.Model):
    """Imaging modality types with configuration"""
    
    # Common modality codes
    code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text="DICOM modality code (e.g., CT, MR, XR)"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Configuration
    default_body_parts = models.JSONField(default=list, blank=True)
    typical_procedures = models.JSONField(default=list, blank=True)
    
    # Pricing (optional)
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Modalities"
        ordering = ['display_order', 'code']
        indexes = [
            models.Index(fields=['code', 'is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Study(models.Model):
    """Medical study/examination model with comprehensive metadata"""
    
    STATUS_SCHEDULED = 'scheduled'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_REPORTED = 'reported'
    STATUS_APPROVED = 'approved'
    STATUS_SUSPENDED = 'suspended'
    STATUS_CANCELLED = 'cancelled'
    
    STUDY_STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_REPORTED, 'Reported'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_SUSPENDED, 'Suspended'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    PRIORITY_CHOICES = [
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('stat', 'STAT'),
        ('elective', 'Elective'),
    ]

    # DICOM Identifiers
    study_instance_uid = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="DICOM Study Instance UID"
    )
    accession_number = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Accession number for this study"
    )
    study_id = models.CharField(max_length=50, blank=True)
    
    # Relationships
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_index=True)
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, db_index=True)
    modality = models.ForeignKey(Modality, on_delete=models.PROTECT, db_index=True)
    
    # Study Information
    study_description = models.CharField(max_length=200)
    study_date = models.DateTimeField(db_index=True)
    study_time = models.TimeField(null=True, blank=True)
    
    # Clinical Information
    referring_physician = models.CharField(max_length=100)
    referring_physician_phone = models.CharField(max_length=20, blank=True)
    performing_physician = models.CharField(max_length=100, blank=True)
    
    radiologist = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_studies',
        limit_choices_to={'role__in': ['admin', 'radiologist']},
        db_index=True
    )
    
    # Study Details
    body_part = models.CharField(max_length=100, blank=True, db_index=True)
    procedure_code = models.CharField(max_length=50, blank=True)
    laterality = models.CharField(
        max_length=1,
        choices=[('L', 'Left'), ('R', 'Right'), ('B', 'Bilateral')],
        blank=True
    )
    
    # Clinical Context
    clinical_info = models.TextField(blank=True)
    clinical_history = models.TextField(blank=True)
    indications = models.TextField(blank=True)
    study_comments = models.TextField(blank=True)
    
    # Status and Priority
    status = models.CharField(
        max_length=20,
        choices=STUDY_STATUS_CHOICES,
        default=STATUS_SCHEDULED,
        db_index=True
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='routine',
        db_index=True
    )
    
    # Quality and Verification
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_studies'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Flags
    is_urgent = models.BooleanField(default=False, db_index=True)
    is_stat = models.BooleanField(default=False, db_index=True)
    is_critical = models.BooleanField(default=False, db_index=True)
    requires_comparison = models.BooleanField(default=False)
    
    # Metadata
    number_of_series = models.IntegerField(default=0)
    number_of_instances = models.IntegerField(default=0)
    storage_size = models.BigIntegerField(default=0, help_text="Size in bytes")
    
    # Audit Trail
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_studies',
        db_index=True
    )
    upload_date = models.DateTimeField(auto_now_add=True, db_index=True)
    last_updated = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    access_count = models.IntegerField(default=0)

    class Meta:
        verbose_name_plural = "Studies"
        ordering = ['-study_date', '-upload_date']
        indexes = [
            models.Index(fields=['status', 'priority', '-study_date']),
            models.Index(fields=['facility', 'status']),
            models.Index(fields=['radiologist', 'status']),
            models.Index(fields=['accession_number']),
            models.Index(fields=['study_instance_uid']),
            models.Index(fields=['-study_date']),
            models.Index(fields=['is_urgent', 'is_stat', 'is_critical']),
        ]
        permissions = [
            ('can_approve_study', 'Can approve study'),
            ('can_assign_radiologist', 'Can assign radiologist'),
            ('can_delete_study', 'Can delete study'),
            ('can_export_study', 'Can export study'),
        ]

    def __str__(self):
        return f"{self.accession_number} - {self.patient.full_name} ({self.modality.code})"
    
    def get_series_count(self):
        """Get accurate count of series"""
        return self.series_set.count()
    
    def get_image_count(self):
        """Get accurate count of images"""
        return DicomImage.objects.filter(series__study=self).count()
    
    def update_counts(self):
        """Update series and instance counts"""
        self.number_of_series = self.get_series_count()
        self.number_of_instances = self.get_image_count()
        self.save(update_fields=['number_of_series', 'number_of_instances'])
    
    def increment_access_count(self):
        """Increment access counter"""
        self.access_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['access_count', 'last_accessed'])
    
    def can_be_edited_by(self, user):
        """Check if user can edit this study"""
        if user.is_admin():
            return True
        if user.facility == self.facility:
            return user.can_upload_studies()
        return False


class Series(models.Model):
    """DICOM Series model with enhanced metadata"""
    
    # DICOM Identifiers
    series_instance_uid = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="DICOM Series Instance UID"
    )
    
    # Relationships
    study = models.ForeignKey(Study, on_delete=models.CASCADE, db_index=True)
    
    # Series Information
    series_number = models.IntegerField(db_index=True)
    series_description = models.CharField(max_length=200, blank=True)
    modality = models.CharField(max_length=10, db_index=True)
    
    # Anatomical Information
    body_part = models.CharField(max_length=100, blank=True, db_index=True)
    laterality = models.CharField(max_length=1, blank=True)
    patient_position = models.CharField(max_length=20, blank=True)
    
    # Acquisition Parameters
    protocol_name = models.CharField(max_length=200, blank=True)
    sequence_name = models.CharField(max_length=200, blank=True)
    
    # Image Parameters
    slice_thickness = models.FloatField(null=True, blank=True)
    pixel_spacing = models.CharField(max_length=50, blank=True)
    image_orientation = models.CharField(max_length=100, blank=True)
    rows = models.IntegerField(null=True, blank=True)
    columns = models.IntegerField(null=True, blank=True)
    
    # Series Details
    number_of_instances = models.IntegerField(default=0)
    series_date = models.DateField(null=True, blank=True)
    series_time = models.TimeField(null=True, blank=True)
    
    # Equipment Information
    manufacturer = models.CharField(max_length=100, blank=True)
    manufacturer_model = models.CharField(max_length=100, blank=True)
    station_name = models.CharField(max_length=100, blank=True)
    
    # Processing
    is_processed = models.BooleanField(default=False)
    has_3d_volume = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Series"
        ordering = ['study', 'series_number']
        indexes = [
            models.Index(fields=['study', 'series_number']),
            models.Index(fields=['series_instance_uid']),
            models.Index(fields=['modality', 'body_part']),
        ]

    def __str__(self):
        return f"Series {self.series_number} - {self.series_description or 'Unnamed'}"
    
    def get_image_count(self):
        """Get accurate count of images"""
        return self.images.count()
    
    def update_instance_count(self):
        """Update instance count"""
        self.number_of_instances = self.get_image_count()
        self.save(update_fields=['number_of_instances'])


class DicomImage(models.Model):
    """Individual DICOM image/instance model"""
    
    # DICOM Identifiers
    sop_instance_uid = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="DICOM SOP Instance UID"
    )
    sop_class_uid = models.CharField(max_length=100, blank=True)
    
    # Relationships
    series = models.ForeignKey(
        Series,
        on_delete=models.CASCADE,
        related_name='images',
        db_index=True
    )
    
    # Instance Information
    instance_number = models.IntegerField(db_index=True)
    
    # Spatial Information
    image_position = models.CharField(max_length=100, blank=True)
    slice_location = models.FloatField(null=True, blank=True, db_index=True)
    image_orientation = models.CharField(max_length=100, blank=True)
    
    # Image Characteristics
    rows = models.IntegerField(null=True, blank=True)
    columns = models.IntegerField(null=True, blank=True)
    bits_allocated = models.IntegerField(null=True, blank=True)
    bits_stored = models.IntegerField(null=True, blank=True)
    photometric_interpretation = models.CharField(max_length=50, blank=True)
    
    # Window/Level
    window_center = models.FloatField(null=True, blank=True)
    window_width = models.FloatField(null=True, blank=True)
    
    # Files
    file_path = models.FileField(upload_to='dicom/images/')
    file_size = models.BigIntegerField(help_text="Size in bytes")
    thumbnail = models.ImageField(
        upload_to='dicom/thumbnails/',
        null=True,
        blank=True
    )
    preview = models.ImageField(
        upload_to='dicom/previews/',
        null=True,
        blank=True
    )
    
    # Processing Status
    processed = models.BooleanField(default=False, db_index=True)
    thumbnail_generated = models.BooleanField(default=False)
    preview_generated = models.BooleanField(default=False)
    
    # Quality
    has_pixel_data = models.BooleanField(default=True)
    is_corrupted = models.BooleanField(default=False)
    
    # Timestamps
    acquisition_datetime = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['series', 'instance_number']
        indexes = [
            models.Index(fields=['series', 'instance_number']),
            models.Index(fields=['sop_instance_uid']),
            models.Index(fields=['slice_location']),
            models.Index(fields=['processed']),
        ]

    def __str__(self):
        return f"Image {self.instance_number} - {self.sop_instance_uid[:20]}..."

    def get_file_name(self):
        """Get filename without path"""
        return os.path.basename(self.file_path.name) if self.file_path else ''
    
    def get_file_size_mb(self):
        """Get file size in MB"""
        return round(self.file_size / (1024 * 1024), 2)


class StudyAttachment(models.Model):
    """Additional files attached to studies"""
    
    ATTACHMENT_TYPES = [
        ('report', 'Report'),
        ('previous_study', 'Previous Study'),
        ('dicom_study', 'DICOM Study'),
        ('word_document', 'Word Document'),
        ('pdf_document', 'PDF Document'),
        ('image', 'Image'),
        ('document', 'Document'),
        ('lab_result', 'Lab Result'),
        ('clinical_note', 'Clinical Note'),
        ('other', 'Other'),
    ]

    study = models.ForeignKey(
        Study,
        on_delete=models.CASCADE,
        related_name='attachments',
        db_index=True
    )
    
    # File Information
    file = models.FileField(upload_to='study_attachments/')
    file_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, db_index=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Metadata
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    thumbnail = models.ImageField(
        upload_to='attachment_thumbnails/',
        null=True,
        blank=True
    )
    
    # For DICOM study references
    attached_study = models.ForeignKey(
        'Study',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referenced_by_attachments'
    )
    study_date = models.DateTimeField(null=True, blank=True)
    modality = models.CharField(max_length=10, blank=True)
    
    # Document metadata
    page_count = models.IntegerField(null=True, blank=True)
    author = models.CharField(max_length=200, blank=True)
    creation_date = models.DateTimeField(null=True, blank=True)
    
    # Access Control
    is_public = models.BooleanField(default=True)
    allowed_roles = models.JSONField(default=list, blank=True)
    
    # Version Control
    version = models.CharField(max_length=20, default='1.0')
    replaced_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    is_current_version = models.BooleanField(default=True, db_index=True)
    
    # Audit Fields
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    upload_date = models.DateTimeField(auto_now_add=True, db_index=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    access_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-upload_date']
        indexes = [
            models.Index(fields=['study', 'file_type']),
            models.Index(fields=['is_current_version']),
        ]

    def __str__(self):
        return f"{self.name} - {self.study.accession_number}"

    def get_file_extension(self):
        """Get file extension"""
        return os.path.splitext(self.file.name)[1].lower()
    
    def increment_access_count(self):
        """Increment access counter"""
        self.access_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['access_count', 'last_accessed'])


class StudyNote(models.Model):
    """Notes and comments on studies"""
    
    study = models.ForeignKey(
        Study,
        on_delete=models.CASCADE,
        related_name='notes',
        db_index=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Note Content
    note = models.TextField()
    note_type = models.CharField(
        max_length=20,
        choices=[
            ('general', 'General'),
            ('clinical', 'Clinical'),
            ('technical', 'Technical'),
            ('quality', 'Quality Issue'),
            ('administrative', 'Administrative'),
        ],
        default='general',
        db_index=True
    )
    
    # Privacy
    is_private = models.BooleanField(default=False, db_index=True)
    is_important = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['study', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"Note by {self.user.username} on {self.study.accession_number}"
