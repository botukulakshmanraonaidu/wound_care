from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions, viewsets, filters, parsers
from .models import Admin, ActivityLog
from .serializers import UserCreateSerializer, AdminUserSerializer, ActivityLogSerializer
from .permissions import isAdminRole, isAdminFullAccess
from django.db.models import Count
from datetime import datetime, timedelta
import os
import math
import shutil
from django.db import connection
try:
    import cloudinary
    import cloudinary.api
except ImportError:
    cloudinary = None

def log_activity(user_email, action, target_user=None, description="", ip_address=None, severity='INFO'):
    ActivityLog.objects.create(
        user_email=user_email,
        target_user=target_user,
        action=action,
        description=description,
        ip_address=ip_address,
        severity=severity
    )

class CreateAdminAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, isAdminRole]
    
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_activity(
                user_email=request.data.get('admin_email', 'system'), # Should be from request.user
                action='CREATE',
                target_user=user.full_name,
                description=f"Created user {user.full_name} with role {user.role_type}"
            )
            return Response(
                {"message": "User Registered Successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from .permissions import isAdminRole, isAdminFullAccess

class UserListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, isAdminRole]
    queryset = Admin.objects.all()
    serializer_class = AdminUserSerializer

class UserDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, isAdminRole]
    queryset = Admin.objects.all()
    serializer_class = AdminUserSerializer

    def perform_update(self, serializer):
        user = serializer.save()
        log_activity(
            user_email=self.request.data.get('admin_email', 'system'),
            action='UPDATE',
            target_user=user.full_name,
            description=f"Updated user {user.full_name}"
        )

    def perform_destroy(self, instance):
        # Explicit check for Full access before deletion
        if not isAdminFullAccess().has_permission(self.request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Administrators with Full access can delete users.")
            
        name = instance.full_name
        instance.delete()
        log_activity(
            user_email=self.request.data.get('admin_email', 'system'),
            action='DELETE',
            target_user=name,
            description=f"Deleted user {name}"
        )

class ActivityLogViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, isAdminRole]
    queryset = ActivityLog.objects.all().order_by('-timestamp')
    serializer_class = ActivityLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user_email', 'action', 'target_user', 'description']
    ordering_fields = ['timestamp', 'severity']

    def get_queryset(self):
        queryset = super().get_queryset()
        severity = self.request.query_params.get('severity')
        action = self.request.query_params.get('action')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if severity:
            queryset = queryset.filter(severity=severity)
        if action:
            queryset = queryset.filter(action=action)
        
        # Robust date filtering
        try:
            if start_date:
                # Ensure it's a valid date string before filtering
                datetime.strptime(start_date, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__date__gte=start_date)
            if end_date:
                datetime.strptime(end_date, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__date__lte=end_date)
        except (ValueError, TypeError):
            # If date format is invalid, just ignore those filters instead of 500 error
            pass
            
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            # Prefetch users for the current page
            emails = {log.user_email for log in page if log.user_email}
            user_map = {u.email: u.full_name for u in Admin.objects.filter(email__in=emails).only('email', 'full_name')}
            
            serializer = self.get_serializer(page, many=True, context={'request': request, 'user_map': user_map})
            return self.get_paginated_response(serializer.data)

        # Prefetch users for the whole queryset (if not paginated)
        emails = {log.user_email for log in queryset if log.user_email}
        user_map = {u.email: u.full_name for u in Admin.objects.filter(email__in=emails).only('email', 'full_name')}
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request, 'user_map': user_map})
        return Response(serializer.data)

from .models import SystemFile
from .serializers import SystemFileSerializer
import os

class SystemFileViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, isAdminRole] # Restrict to Admin
    queryset = SystemFile.objects.all().order_by('-created_at')
    serializer_class = SystemFileSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)
        log_activity(
            user_email=self.request.user.email,
            action='CREATE',
            target_user=instance.name,
            description=f"Uploaded file: {instance.name} ({instance.size})",
            severity='INFO'
        )
        
    def perform_destroy(self, instance):
        file_name = instance.name
        # Delete the actual file — safe for both local and Cloudinary storage
        if instance.file:
            try:
                # .path only works for local filesystem storage
                # Cloudinary raises NotImplementedError for .path
                local_path = instance.file.path
                if os.path.isfile(local_path):
                    os.remove(local_path)
            except (NotImplementedError, ValueError, AttributeError):
                # Remote/cloud storage (Cloudinary) — no local file to delete
                pass
        instance.delete()
        
        log_activity(
            user_email=self.request.user.email,
            action='DELETE',
            target_user=file_name,
            description=f"Deleted file: {file_name}",
            severity='WARNING'
        )

def get_directory_size(path):
    total_size = 0
    try:
        if not os.path.exists(path):
            return 0
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
    except Exception as e:
        print(f"Error calculating size for {path}: {e}")
    return total_size

from django.core.cache import cache

class SystemStorageStatsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, isAdminRole]

    def get(self, request):
        # Cache for 1 hour
        cache_key = 'system_storage_stats'
        stats = cache.get(cache_key)
        
        if stats:
            return Response(stats)
            
        from django.conf import settings
        
        # 1. Database Size (Supabase / Postgres)
        db_size_bytes = 0
        try:
            with connection.cursor() as cursor:
                # Query the size of the current database
                cursor.execute("SELECT pg_database_size(current_database())")
                result = cursor.fetchone()
                if result:
                    db_size_bytes = result[0]
        except Exception as e:
            print(f"Error fetching DB size: {e}")

        # 2. Cloudinary Stats
        cloud_storage_bytes = 0
        image_count = 0
        try:
            if cloudinary and os.getenv('CLOUDINARY_CLOUD_NAME'):
                # Configure if not already done globally
                cloudinary.config(
                    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
                    api_key=os.getenv('CLOUDINARY_API_KEY'),
                    api_secret=os.getenv('CLOUDINARY_API_SECRET')
                )
                
                # Fetch usage summary
                usage = cloudinary.api.usage()
                cloud_storage_bytes = usage.get('resources', {}).get('usage', 0)
                
                # More direct image count (recent resources)
                resources = cloudinary.api.resources(type="upload", max_results=1)
                image_count = resources.get('total_count', 0)
        except Exception as e:
            print(f"Error fetching Cloudinary stats: {e}")

        # 3. Local Media Stats (Fallback/Reports)
        local_reports_size = get_directory_size(os.path.join(settings.MEDIA_ROOT, 'assessment_reports'))
        
        # Total storage calculation
        total_used = db_size_bytes + cloud_storage_bytes + local_reports_size
        app_quota = 25 * 1024 * 1024 * 1024 # 25GB Combined Quota Example
        
        stats = {
            "used_storage_bytes": total_used,
            "total_storage_bytes": app_quota,
            "free_storage_bytes": max(0, app_quota - total_used),
            "used_percentage": min(100, (total_used / app_quota) * 100) if app_quota > 0 else 0,
            "file_count": image_count,
            "breakdown": [
                {
                    "category": "Supabase (Patient Records)", 
                    "size_bytes": db_size_bytes, 
                    "label": self.format_size(db_size_bytes),
                    "color": "#0F172A"
                },
                {
                    "category": "Cloudinary (Wound Images)", 
                    "size_bytes": cloud_storage_bytes, 
                    "label": self.format_size(cloud_storage_bytes),
                    "color": "#3B82F6"
                },
                {
                    "category": "System Reports (Local)", 
                    "size_bytes": local_reports_size, 
                    "label": self.format_size(local_reports_size),
                    "color": "#94A3B8"
                }
            ]
        }
        
        # Store in cache for 1 hour (3600 seconds)
        cache.set(cache_key, stats, 3600)
        return Response(stats)

    def format_size(self, size_bytes):
        if size_bytes == 0: return "0 B"
        size_name = ("B", "KB", "MB", "GB", "TB")
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return "%s %s" % (s, size_name[i])

class SystemStatsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, isAdminRole]

    def get(self, request):
        # Cache for 10 minutes
        cache_key = 'system_overview_stats'
        stats = cache.get(cache_key)
        
        if stats:
            return Response(stats)
            
        total_users = Admin.objects.count()
        role_counts = Admin.objects.values('role_type').annotate(count=Count('role_type'))
        
        stats = {
            "total_users": total_users,
            "role_distribution": {item['role_type']: item['count'] for item in role_counts},
            "system_uptime": "99.98%",
            "security_alerts": ActivityLog.objects.filter(action='DELETE').count()
        }
        
        # Store in cache for 10 minutes (600 seconds)
        cache.set(cache_key, stats, 600)
        return Response(stats)
