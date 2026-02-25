from django.db import models
from django.conf import settings

class NurseTask(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
    )
    
    nurse = models.ForeignKey(
        'admin_page.Admin', 
        on_delete=models.CASCADE, 
        related_name='nurse_tasks',
        limit_choices_to={'role_type': 'nurse'}
    )
    patient = models.ForeignKey(
        'addpatient.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nursing_tasks'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_time = models.CharField(max_length=100, default="Today, 05:00 PM")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.nurse.full_name}"

class StaffAnnouncement(models.Model):
    author = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.CASCADE,
        related_name='authored_announcements'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=(('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')),
        default='Medium'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class ShiftLog(models.Model):
    nurse = models.ForeignKey(
        'admin_page.Admin',
        on_delete=models.CASCADE,
        related_name='shift_logs'
    )
    ward = models.CharField(max_length=100)
    shift_type = models.CharField(max_length=20)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.nurse.full_name} - {self.ward} ({self.shift_type})"
