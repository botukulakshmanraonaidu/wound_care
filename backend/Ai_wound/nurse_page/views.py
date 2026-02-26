from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import NurseTask, StaffAnnouncement, ShiftLog
from .serializers import NurseTaskSerializer, StaffAnnouncementSerializer, ShiftLogSerializer

class NurseTaskViewSet(viewsets.ModelViewSet):
    serializer_class = NurseTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = NurseTask.objects.all().select_related('patient', 'nurse').order_by('status', '-created_at')
        if user.role_type == 'nurse':
            return queryset.filter(nurse=user)
        return queryset

    def perform_create(self, serializer):
        # Automatically assign to logged in nurse if not provided
        if self.request.user.role_type == 'nurse':
            serializer.save(nurse=self.request.user)
        else:
            serializer.save()

class StaffAnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    """Announcements are read-only for nurses, but can be managed by admins."""
    serializer_class = StaffAnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = StaffAnnouncement.objects.all().order_by('-created_at')

class ShiftLogViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role_type == 'nurse':
            return ShiftLog.objects.filter(nurse=user).order_by('-start_time')
        return ShiftLog.objects.all().order_by('-start_time')

    @action(detail=False, methods=['post'])
    def start_shift(self, request):
        user = request.user
        if user.role_type != 'nurse':
            return Response({"error": "Only nurses can start shifts"}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if there's already an active shift
        active_shift = ShiftLog.objects.filter(nurse=user, end_time__isnull=True).first()
        if active_shift:
            return Response({"error": "Shift already active"}, status=status.HTTP_400_BAD_REQUEST)
        
        ward = request.data.get('ward', getattr(user, 'ward', 'General'))
        shift_type = request.data.get('shift_type', getattr(user, 'shift', 'Day'))
        
        shift = ShiftLog.objects.create(
            nurse=user,
            ward=ward,
            shift_type=shift_type
        )
        return Response(ShiftLogSerializer(shift).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def end_shift(self, request):
        user = request.user
        active_shift = ShiftLog.objects.filter(nurse=user, end_time__isnull=True).first()
        if not active_shift:
            return Response({"error": "No active shift found"}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.utils import timezone
        active_shift.end_time = timezone.now()
        active_shift.notes = request.data.get('notes', '')
        active_shift.save()
        return Response(ShiftLogSerializer(active_shift).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def get_stats(self, request):
        user = request.user
        if user.role_type != 'nurse':
            return Response({"error": "Only nurses can access these stats"}, status=status.HTTP_403_FORBIDDEN)
            
        from addpatient.models import Patient, Assessment
        from django.utils import timezone
        today = timezone.now().date()
        
        active_patients = Patient.objects.filter(assigned_nurse=user).count()
        pending_tasks = NurseTask.objects.filter(nurse=user, status='pending').count()
        completed_tasks = NurseTask.objects.filter(nurse=user, status='completed', updated_at__date=today).count()
        wound_scans = Assessment.objects.filter(assessed_by=user, created_at__date=today).count()
        
        # New: Unread notifications for the nurse
        from addpatient.models import Notification
        unread_notifications = Notification.objects.filter(recipient=user, is_read=False).count()
        
        return Response({
            "active_patients": active_patients,
            "doc_due": pending_tasks,
            "scans": wound_scans,
            "completed": completed_tasks,
            "unread_count": unread_notifications,
            "last_updated": timezone.now().isoformat()
        })

    @action(detail=False, methods=['get'])
    def get_recent_documentation(self, request):
        user = request.user
        if user.role_type != 'nurse':
            return Response({"error": "Only nurses can access this"}, status=status.HTTP_403_FORBIDDEN)
            
        from addpatient.models import Assessment
        from addpatient.serializers import AssessmentSerializer
        
        # Get last 5 assessments by this nurse
        recent = Assessment.objects.filter(assessed_by=user).order_by('-created_at')[:5]
        serializer = AssessmentSerializer(recent, many=True)
        return Response(serializer.data)
