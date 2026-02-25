from django.db import models
from datetime import datetime
from .utils import generate_mrn

# Create your models here.
class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    mrn = models.CharField(max_length=20, unique=True, editable=False)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20)
    admission_date = models.DateField()
    ward_department = models.CharField(max_length=100)
    room_bed_number = models.CharField(max_length=50)
    assigning_physician = models.CharField(max_length=100)
    primary_diagnosis = models.TextField()
    status = models.CharField(max_length=20, default='Active')
    
    # Contact Information
    contact_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_number = models.CharField(max_length=20, blank=True)
    
    assigned_doctor = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_patients',
        limit_choices_to={'role_type': 'doctor'}
    )
    assigned_nurse = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_patients_nurse',
        limit_choices_to={'role_type': 'nurse'}
    )
    last_visit_datetime = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.mrn:
            self.mrn = generate_mrn()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.mrn})"

# patient visit model 
class PatientVisit(models.Model):
    patient = models.ForeignKey(
        Patient,
        to_field='mrn',
        db_column='patient_mrn',
        on_delete=models.CASCADE,
        related_name='visits'
    )
    visit_datetime = models.DateTimeField()
    visit_type = models.CharField(
        max_length=50,
        choices=[
            ('OPD', 'OPD'),
            ('FOLLOW_UP', 'Follow-up'),
            ('EMERGENCY', 'Emergency'),
            ('WARD', 'Ward Round')
        ]
    )
    visit_reason = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        ordering = ['-visit_datetime']

class Notification(models.Model):
    recipient = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.full_name}: {self.message}"

class PatientTask(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    title = models.CharField(max_length=255)
    due = models.CharField(max_length=100, default="Today, 05:00 PM")
    scheduled_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Task: {self.title} for {self.patient}"

class Assessment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='assessments')
    assessed_by = models.ForeignKey('admin_page.Admin', on_delete=models.SET_NULL, null=True, related_name='performed_assessments')
    wound_type = models.CharField(max_length=100, blank=True)
    onset_date = models.DateField(null=True, blank=True)
    wound_stage = models.CharField(max_length=50, blank=True)
    exudate_amount = models.CharField(max_length=50, blank=True)
    length = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    depth = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pain_level = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    body_location = models.CharField(max_length=100, blank=True) # e.g., "Left Foot - Anterior"
    
    # ML Analysis Fields
    ml_analysis_result = models.JSONField(null=True, blank=True)
    cure_recommendation = models.TextField(blank=True, null=True)
    reduction_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    healing_index = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    algorithm_analysis = models.JSONField(null=True, blank=True)
    report_file = models.FileField(upload_to='assessment_reports/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Assessment for {self.patient} on {self.created_at.date()}"

class AssessmentImage(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='images')
    full_image = models.ImageField(upload_to='wound_images/full/')
    selected_area_image = models.ImageField(upload_to='wound_images/selected/', null=True, blank=True)
    annotations = models.JSONField(null=True, blank=True) # To store polygon points
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.assessment}"

class ChatMessage(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='chat_messages'
    )
    sender = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"From {self.sender} to {self.receiver} about {self.patient}"

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

@receiver(post_save, sender=PatientVisit)
def update_patient_last_visit(sender, instance, **kwargs):
    patient = instance.patient
    # Be more permissive: Update if it's a new latest visit or if specifically requested
    if not patient.last_visit_datetime or instance.visit_datetime >= patient.last_visit_datetime:
        patient.last_visit_datetime = instance.visit_datetime
        patient.save(update_fields=['last_visit_datetime'])

@receiver(pre_save, sender=Patient)
def track_assignment_changes(sender, instance, **kwargs):
    """
    Stores the previous assigned doctor and nurse on the instance to check for changes in post_save.
    """
    if instance.pk:
        try:
            old_instance = Patient.objects.get(pk=instance.pk)
            instance._old_assigned_doctor = old_instance.assigned_doctor
            instance._old_assigned_nurse = old_instance.assigned_nurse
        except Patient.DoesNotExist:
            instance._old_assigned_doctor = None
            instance._old_assigned_nurse = None
    else:
        instance._old_assigned_doctor = None
        instance._old_assigned_nurse = None

@receiver(post_save, sender=Patient)
def create_patient_assignment_notifications(sender, instance, created, **kwargs):
    """
    Creates notifications when a doctor or nurse is newly assigned or reassigned to a patient.
    """
    # 1. Handle Doctor Assignment
    old_doctor = getattr(instance, '_old_assigned_doctor', None)
    if instance.assigned_doctor and (created or instance.assigned_doctor != old_doctor):
        Notification.objects.create(
            recipient=instance.assigned_doctor,
            patient=instance,
            message=f"You have been assigned as the Primary Doctor for patient: {instance.first_name} {instance.last_name}"
        )
        
        # Create initial task for doctor
        PatientTask.objects.create(
            patient=instance,
            title="Initial Patient Review",
            due="Today, 05:00 PM"
        )

    # 2. Handle Nurse Assignment
    old_nurse = getattr(instance, '_old_assigned_nurse', None)
    if instance.assigned_nurse and (created or instance.assigned_nurse != old_nurse):
        Notification.objects.create(
            recipient=instance.assigned_nurse,
            patient=instance,
            message=f"You have been assigned to the wound care team for patient: {instance.first_name} {instance.last_name}"
        )
        
        # Create initial task for nurse
        PatientTask.objects.create(
            patient=instance,
            title="Initial Wound Assessment",
            due="Today, 06:00 PM"
        )



@receiver(post_save, sender=ChatMessage)
def create_chat_notification(sender, instance, created, **kwargs):
    """
    Creates a notification for the receiver when a new chat message is sent.
    """
    if created:
        Notification.objects.create(
            recipient=instance.receiver,
            patient=instance.patient,
            message=f"New message from {instance.sender.full_name or instance.sender.email} regarding patient {instance.patient.first_name}"
        )

# AppUser removed as requested. Using admin_page.Admin for authentication.
from django.contrib.auth.models import BaseUserManager
class AppUserManager(BaseUserManager):
    pass


from django.db.models.signals import post_save
from django.dispatch import receiver
import os

@receiver(post_save, sender=AssessmentImage)
def sync_assessment_image_to_system_files(sender, instance, created, **kwargs):
    """Sync newly uploaded assessment images to SystemFile storage."""
    if created and instance.full_image:
        from admin_page.models import SystemFile
        
        # Calculate size string
        try:
            size_bytes = instance.full_image.size
            if size_bytes < 1024:
                size_str = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
        except:
            size_str = "Unknown"
            
        # Get extension
        ext = os.path.splitext(instance.full_image.name)[1].upper().replace('.', '') or 'IMG'
        
        SystemFile.objects.create(
            name=f"Wound Image - {instance.assessment.patient.first_name} {instance.assessment.patient.last_name} (#{instance.assessment.id})",
            file=instance.full_image,
            uploaded_by=instance.assessment.assessed_by,
            size=size_str,
            file_type=ext
        )

@receiver(post_save, sender=Assessment)
def sync_assessment_report_to_system_files(sender, instance, **kwargs):
    """Sync generated assessment reports to SystemFile storage."""
    # Check if report_file was just added/updated
    if instance.report_file:
        from admin_page.models import SystemFile
        
        # Avoid duplicate entries for the same report
        report_name = f"Report - {instance.patient.first_name} {instance.patient.last_name} ({instance.created_at.date()})"
        if not SystemFile.objects.filter(name=report_name, file=instance.report_file).exists():
            # Calculate size string
            try:
                size_bytes = instance.report_file.size
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
            except:
                size_str = "Unknown"
                
            SystemFile.objects.create(
                name=report_name,
                file=instance.report_file,
                uploaded_by=instance.assessed_by,
                size=size_str,
                file_type="PDF"
            )
