from rest_framework import serializers
from .models import NurseTask, StaffAnnouncement, ShiftLog
from addpatient.serializers import PatientSerializer

class NurseTaskSerializer(serializers.ModelSerializer):
    patient_details = PatientSerializer(source='patient', read_only=True)
    nurse_name = serializers.CharField(source='nurse.full_name', read_only=True)
    completed = serializers.SerializerMethodField()

    class Meta:
        model = NurseTask
        fields = [
            'id', 'nurse', 'nurse_name', 'patient', 'patient_details',
            'title', 'description', 'due_time', 'status', 'priority', 'completed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['nurse', 'created_at', 'updated_at']

    def get_completed(self, obj):
        return obj.status == 'completed'

class StaffAnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = StaffAnnouncement
        fields = ['id', 'author', 'author_name', 'title', 'message', 'priority', 'created_at']

class ShiftLogSerializer(serializers.ModelSerializer):
    nurse_name = serializers.CharField(source='nurse.full_name', read_only=True)

    class Meta:
        model = ShiftLog
        fields = ['id', 'nurse', 'nurse_name', 'ward', 'shift_type', 'start_time', 'end_time', 'notes']
