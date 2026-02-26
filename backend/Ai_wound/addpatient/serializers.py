from rest_framework import serializers
from .models import Patient
from admin_page.models import Admin

class DoctorSerializer(serializers.ModelSerializer):
    """Serializer for doctor information in patient assignment"""
    class Meta:
        from admin_page.models import Admin
        model = Admin
        fields = ['id', 'full_name', 'email', 'specialization', 'department']


class PatientSerializer(serializers.ModelSerializer):
    """
    Serializer to map frontend field names to backend model fields
    """

    # ---------- FIELD MAPPING (React → Django Model) ----------
    dob = serializers.DateField(source="date_of_birth")
    ward = serializers.CharField(source="ward_department")
    room = serializers.CharField(source="room_bed_number")
    physician = serializers.CharField(source="assigning_physician")
    diagnosis = serializers.CharField(source="primary_diagnosis")
    last_visit = serializers.DateTimeField(source="last_visit_datetime", required=False, allow_null=True)
    
    # Contact Information mappings
    contact_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_number = serializers.CharField(required=False, allow_blank=True)
    
    # Assigned doctor fields
    assigned_doctor = DoctorSerializer(read_only=True)
    assigned_doctor_id = serializers.PrimaryKeyRelatedField(
        queryset=Admin.objects.filter(role_type='doctor'),
        source='assigned_doctor',
        write_only=True,
        required=False,
        allow_null=True
    )
    assigned_nurse = DoctorSerializer(read_only=True)
    assigned_nurse_id = serializers.PrimaryKeyRelatedField(
        queryset=Admin.objects.filter(role_type='nurse'),
        source='assigned_nurse',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "mrn",

            # mapped fields (frontend)
            "dob",
            "gender",
            "status",
            "last_visit",
            "admission_date",
            "ward",
            "room",
            "physician",
            "diagnosis",
            
            # contact info
            "contact_number",
            "address",
            "emergency_contact_name",
            "emergency_contact_number",
            
            # assignment fields
            "assigned_doctor",
            "assigned_doctor_id",
            "assigned_nurse",
            "assigned_nurse_id",
        ]

    def create(self, validated_data):
        # We don't pop last_visit_datetime so it's saved on the model
        last_visit_data = validated_data.get('last_visit_datetime', None)
        patient = super().create(validated_data)
        
        if last_visit_data:
            from .models import PatientVisit
            PatientVisit.objects.create(
                patient=patient,
                visit_datetime=last_visit_data,
                visit_type='FOLLOW_UP',
                visit_reason='Initial visit recorded during patient addition'
            )
        return patient

    def update(self, instance, validated_data):
        # We don't pop last_visit_datetime so it's saved on the model
        last_visit_data = validated_data.get('last_visit_datetime', None)
        patient = super().update(instance, validated_data)
        
        if last_visit_data:
            from .models import PatientVisit
            # Always record the visit if provided
            PatientVisit.objects.create(
                patient=patient,
                visit_datetime=last_visit_data,
                visit_type='FOLLOW_UP',
                visit_reason='Visit updated/recorded in patient details'
            )
        
        # 🔑 IMPORTANT: Refresh from DB to get the latest values (including what signals might have updated)
        patient.refresh_from_db()
        return patient

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        from admin_page.models import Admin
        model = Admin
        fields = ["email", "password", "full_name", "role_type"]

    def create(self, validated_data):
        from admin_page.models import Admin
        password = validated_data.pop("password")
        user = Admin.objects.create(**validated_data)
        user.raw_password = password # SAVE PLAIN TEXT
        user.set_password(password)
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        if email and password:
            try:
                from django.contrib.auth import authenticate
                user = authenticate(username=email, password=password)
                if not user:
                    raise serializers.ValidationError("Invalid email or password")
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled")
                data["user"] = user
            except Exception:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Must include both email and password")
        return data

class NotificationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.first_name', read_only=True)
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)

    class Meta:
        from .models import Notification
        model = Notification
        fields = ['id', 'recipient', 'patient', 'patient_name', 'patient_id', 'message', 'is_read', 'created_at']

class PatientTaskSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import PatientTask
        model = PatientTask
        fields = ['id', 'patient', 'title', 'due', 'scheduled_date', 'completed', 'created_at']

class AssessmentImageSerializer(serializers.ModelSerializer):
    # use_url=True ensures full Cloudinary URLs are returned, not relative paths
    full_image = serializers.ImageField(use_url=True)
    selected_area_image = serializers.ImageField(use_url=True, allow_null=True, required=False)

    class Meta:
        from .models import AssessmentImage
        model = AssessmentImage
        fields = ['id', 'assessment', 'full_image', 'selected_area_image', 'annotations', 'created_at']

class AssessmentSerializer(serializers.ModelSerializer):
    images = AssessmentImageSerializer(many=True, read_only=True)
    assessed_by_name = serializers.CharField(source='assessed_by.full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.first_name', read_only=True)
    patient_last_name = serializers.CharField(source='patient.last_name', read_only=True)
    patient_mrn = serializers.CharField(source='patient.mrn', read_only=True)
    patient_dob = serializers.DateField(source='patient.date_of_birth', read_only=True)

    stage = serializers.CharField(source='wound_stage', read_only=True)
    tissue_composition = serializers.SerializerMethodField()

    def get_tissue_composition(self, obj):
        default = {"granulation": 0, "slough": 0, "necrotic": 0}
        if obj.ml_analysis_result:
            comp = obj.ml_analysis_result.get('tissue_composition', {})
            return {**default, **comp}
        return default

    class Meta:
        from .models import Assessment
        model = Assessment
        fields = [
            'id', 'patient', 'patient_name', 'patient_last_name', 'patient_mrn', 'patient_dob',
            'assessed_by', 'assessed_by_name', 'wound_type', 'onset_date',
            'wound_stage', 'stage', 'exudate_amount', 'length', 'width', 'depth',
            'pain_level', 'notes', 'body_location', 'images', 'created_at',
            'ml_analysis_result', 'tissue_composition', 'reduction_rate', 
            'confidence_score', 'healing_index', 'algorithm_analysis', 
            'cure_recommendation', 'report_file'
        ]
        read_only_fields = [
            'assessed_by', 'assessed_by_name', 'created_at', 'ml_analysis_result', 
            'tissue_composition', 'reduction_rate', 'confidence_score', 
            'healing_index', 'algorithm_analysis', 'cure_recommendation', 'report_file'
        ]

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role_type', read_only=True)
    time = serializers.SerializerMethodField()

    class Meta:
        from .models import ChatMessage
        model = ChatMessage
        fields = ['id', 'patient', 'sender', 'sender_name', 'sender_role', 'receiver', 'message', 'time', 'created_at']
        read_only_fields = ['sender']

    def get_time(self, obj):
        return obj.created_at.strftime("%I:%M %p")

    def validate(self, data):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Validating ChatMessage: {data}")
        return data
