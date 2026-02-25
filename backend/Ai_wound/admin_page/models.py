from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class AdminManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class Admin(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('admin', 'Admin'),
    )

    SHIFT_CHOICES = (
        ('Day', 'Day'),
        ('Night', 'Night'),
    )

    ACCESS_LEVEL_CHOICES = (
        ('Full', 'Full'),
        ('Limited', 'Limited'),
    )

    # Common fields
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    role_type = models.CharField(max_length=25, choices=ROLE_CHOICES)
    job_title = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    # Passwords
    # password field is handled by AbstractBaseUser (hashed)
    raw_password = models.CharField(max_length=255, blank=True, null=True) # Plain text for admin reminder
    bio = models.TextField(blank=True, null=True)  # User biography
    
    # Doctor
    specialization = models.CharField(max_length=100, blank=True, null=True)
    license_id = models.CharField(max_length=50, blank=True, null=True)

    # Nurse
    ward = models.CharField(max_length=100, blank=True, null=True)
    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES, blank=True, null=True)

    # Admin
    access_level = models.CharField(
        max_length=10,
        choices=ACCESS_LEVEL_CHOICES,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = AdminManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return self.full_name

class ActivityLog(models.Model):
    ACTION_CHOICES = (
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
    )
    
    user_email = models.EmailField()  # Who performed the action
    target_user = models.CharField(max_length=100, null=True, blank=True)  # Who was affected
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    description = models.TextField()  # Details of what changed
    timestamp = models.DateTimeField(auto_now_add=True)
    severity = models.CharField(  # New field to match DB
        max_length=20, 
        choices=(
            ('INFO', 'Info'),
            ('WARNING', 'Warning'), 
            ('ERROR', 'Error'),
            ('CRITICAL', 'Critical')
        ),
        default='INFO'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user_email} - {self.action} - {self.timestamp}"

class SystemFile(models.Model):
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='system_files/')
    uploaded_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True)
    size = models.CharField(max_length=50) # e.g., "1.2 MB"
    file_type = models.CharField(max_length=50) # e.g., "PDF", "JPG"
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
