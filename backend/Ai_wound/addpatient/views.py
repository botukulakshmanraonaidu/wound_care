from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes, action, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.authtoken.models import Token
# Removed AnonRateThrottle to disable rate limiting on login
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
import logging
import random
import requests
import json

from .models import Patient, Notification, PatientTask, Assessment, AssessmentImage, ChatMessage
from .serializers import (
    PatientSerializer, SignupSerializer, NotificationSerializer, 
    AssessmentSerializer, AssessmentImageSerializer, PatientTaskSerializer,
    ChatMessageSerializer, PatientVisitSerializer
)
from .reports import generate_assessment_report_pdf

# Create logger instance
logger = logging.getLogger(__name__)

User = get_user_model()

from .permissions import CanAddPatient, CanViewPatientDetails

class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling Patient CRUD operations with role-based filtering.
    """
    queryset = Patient.objects.all().order_by("-id")
    serializer_class = PatientSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), CanAddPatient()]
        if self.action in ['retrieve', 'update', 'partial_update']:
            return [IsAuthenticated(), CanViewPatientDetails()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Patient.objects.all().select_related('assigned_doctor', 'assigned_nurse').order_by("-id")
        
        # Role-based root filtering
        filter_type = self.request.query_params.get('filter')
        
        if filter_type == 'recent_hour':
            from django.utils import timezone
            from datetime import timedelta
            one_hour_ago = timezone.now() - timedelta(hours=1)
            queryset = queryset.filter(created_at__gte=one_hour_ago)
            return queryset

        if filter_type == 'doctor_new_patients':
            from django.utils import timezone
            from datetime import timedelta
            one_hour_ago = timezone.now() - timedelta(hours=1)
            return queryset.filter(
                assigned_doctor=user,
                assigned_nurse__isnull=True,
                created_at__gte=one_hour_ago
            )

        if filter_type == 'recent_assignment':
            from django.utils import timezone
            from datetime import timedelta
            one_hour_ago = timezone.now() - timedelta(hours=1)
            if user.role_type == 'doctor':
                return queryset.filter(assigned_doctor=user, updated_at__gte=one_hour_ago)
            if user.role_type == 'nurse':
                return queryset.filter(assigned_nurse=user, updated_at__gte=one_hour_ago)
            return queryset.filter(updated_at__gte=one_hour_ago)
        if user.role_type == 'doctor':
            if filter_type == 'my':
                # Return only assigned patients
                return queryset.filter(assigned_doctor=user)
            # Doctors can see the list of all patients
            return queryset
            
        if user.role_type == 'nurse':
            if filter_type == 'nurse_recent':
                from django.utils import timezone
                from datetime import timedelta
                two_hours_ago = timezone.now() - timedelta(hours=2)
                return queryset.filter(assigned_nurse=user, updated_at__gte=two_hours_ago)
            elif filter_type == 'my':
                # Return only assigned patients
                return queryset.filter(assigned_nurse=user)
            # Nurses can see the list of all patients
            return queryset
            
        return queryset

    def create(self, request, *args, **kwargs):
        logger.info("Incoming patient data: %s", request.data)
        
        # Auto-assign doctor if creator is a doctor and no specific assignment is made
        data = request.data.copy()
        if request.user.role_type == 'doctor' and not data.get('assigned_doctor_id'):
            data['assigned_doctor_id'] = request.user.id
            logger.info("Auto-assigning doctor %s to new patient", request.user.email)

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            logger.info("Patient created successfully: %s", serializer.data)
            
            # Log Activity
            try:
                from admin_page.views import log_activity
                patient_name = f"{serializer.data.get('first_name', '')} {serializer.data.get('last_name', '')}"
                log_activity(
                    user_email=request.user.email,
                    action='CREATE',
                    target_user=patient_name,
                    description=f"Added new patient: {patient_name}",
                    severity='INFO',
                    request=request
                )
            except Exception as e:
                logger.error(f"Failed to log patient creation: {e}")

            return Response(
                {"message": "Patient added successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED
            )
        logger.error("Validation errors: %s", serializer.errors)
        return Response(
            {"message": "Validation failed", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'], url_path='chat/send')
    def chat_send(self, request, pk=None):
        patient = self.get_object()
        receiver_id = request.data.get('receiver_id')
        message_text = request.data.get('message')
        
        if not receiver_id or not message_text:
            return Response({'error': 'receiver_id and message are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        chat_msg = ChatMessage.objects.create(
            patient=patient,
            sender=request.user,
            receiver_id=receiver_id,
            message=message_text
        )
        
        return Response(ChatMessageSerializer(chat_msg).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def nurses(self, request):
        """
        Safe endpoint for doctors to list available nurses for assignment.
        """
        nurses = User.objects.filter(role_type='nurse', is_active=True)
        data = [{
            'id': n.id,
            'full_name': n.full_name,
            'email': n.email,
            'department': getattr(n, 'department', '')
        } for n in nurses]
        return Response(data)

    @action(detail=False, methods=['get'])
    def doctors(self, request):
        """
        Safe endpoint for nurses to list available doctors for chat.
        """
        doctors = User.objects.filter(role_type='doctor', is_active=True)
        data = [{
            'id': d.id,
            'full_name': d.full_name,
            'email': d.email,
            'specialization': getattr(d, 'specialization', '')
        } for d in doctors]
        return Response(data)

    def perform_update(self, serializer):
        patient = serializer.save()
        patient_name = f"{patient.first_name} {patient.last_name}"
        try:
            from admin_page.views import log_activity
            log_activity(
                user_email=self.request.user.email,
                action='UPDATE',
                target_user=patient_name,
                description=f"Updated patient details: {patient_name}",
                severity='INFO',
                request=self.request
            )
        except Exception as e:
            logger.error(f"Failed to log patient update: {e}")

    def perform_destroy(self, instance):
        name = f"{instance.first_name} {instance.last_name}"
        instance.delete()
        try:
            from admin_page.views import log_activity
            log_activity(
                user_email=self.request.user.email,
                action='DELETE',
                target_user=name,
                description=f"Deleted patient: {name}",
                severity='WARNING',
                request=self.request
            )
        except Exception as e:
            logger.error(f"Failed to log patient deletion: {e}")

from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login_api(request):
    """
    Role-based login using email and password.
    Authentication is performed against the Admin model.
    """
    email = request.data.get("email")
    password = request.data.get("password")
    ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    logger.info(f"DEBUG: Login attempt for email=[{email}] from IP=[{ip_address}]")

    if not email or not password:
        logger.warning("DEBUG: Missing email or password")
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Diagnostic check & Lockout Verification
    try:
        from admin_page.models import Admin
        db_user = Admin.objects.filter(email=email).first()
        if db_user:
            # Check if account is locked
            if db_user.locked_until and db_user.locked_until > timezone.now():
                lock_duration_sec = (db_user.locked_until - timezone.now()).total_seconds()
                lock_duration_min = max(1, int(lock_duration_sec / 60))
                logger.warning(f"DEBUG: Locked account attempt for [{email}]")
                return Response({
                    "error": "Account is locked due to too many failed login attempts.",
                    "details": f"Please try again in {lock_duration_min} minutes."
                }, status=status.HTTP_403_FORBIDDEN)
    except Exception as check_err:
        logger.error(f"DEBUG: Could not check user existence: {check_err}")
        db_user = None

    try:
        user = authenticate(username=email, password=password)
    except Exception as db_err:
        logger.error(f"DATABASE ERROR during login for [{email}]: {db_err}")
        return Response({
            "error": f"Server database error: {str(db_err)}",
            "details": "This usually means the server cannot connect to Supabase."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    logger.info(f"DEBUG: Authenticate result for [{email}]: {user}")

    if user:
        # Reset failed attempts on successful login
        if db_user and db_user.failed_login_attempts > 0:
            db_user.failed_login_attempts = 0
            db_user.locked_until = None
            db_user.save(update_fields=['failed_login_attempts', 'locked_until'])

        logger.info(f"Successful login for: {email}")
        logger.info(f"User authenticated successfully: {email}")
        
        # Log successful login
        try:
            from admin_page.views import log_activity
            log_activity(
                user_email=user.email,
                action='LOGIN',
                description='User logged in successfully',
                severity='INFO',
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log login activity: {e}")
        
        # User is an instance of admin_page.Admin
        refresh = RefreshToken.for_user(user)
        return Response({
            "id": user.id,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "role": user.role_type or 'doctor',
            "access_level": user.access_level or 'Limited',
            "email": user.email,
            "full_name": user.full_name or '',
            "job_title": user.job_title or '',
            "is_superuser": bool(user.is_superuser),
            "is_staff": getattr(user, 'is_staff', False),
            "message": "Login successful"
        }, status=status.HTTP_200_OK)
    else:
        # Handle Failed Login
        if db_user:
            db_user.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts
            if db_user.failed_login_attempts >= 5:
                db_user.locked_until = timezone.now() + timedelta(minutes=15)
                logger.warning(f"SECURITY: Account locked for 15m due to multiple failed attempts: {email}")
                
                try:
                    from admin_page.models import ActivityLog
                    ActivityLog.objects.create(
                        user_email=email,
                        target_user=email,
                        action='FAILED_LOGIN',
                        description="Account locked for 15 minutes due to 5 consecutive failed login attempts.",
                        severity='ERROR',
                        ip_address=ip_address
                    )
                except Exception as e:
                    logger.error(f"Could not log lockout: {e}")
            else:
                try:
                    from admin_page.models import ActivityLog
                    ActivityLog.objects.create(
                        user_email=email,
                        target_user=email,
                        action='FAILED_LOGIN',
                        description=f"Failed login attempt ({db_user.failed_login_attempts}/5).",
                        severity='WARNING',
                        ip_address=ip_address
                    )
                except Exception as e:
                    logger.error(f"Could not log failed login: {e}")
                
            db_user.save(update_fields=['failed_login_attempts', 'locked_until'])
        else:
            try:
                from admin_page.models import ActivityLog
                ActivityLog.objects.create(
                    user_email=email,
                    target_user=email,
                    action='FAILED_LOGIN',
                    description="Failed login attempt for non-existent account.",
                    severity='WARNING',
                    ip_address=ip_address
                )
            except Exception as e:
                logger.error(f"Could not log failed login for non-existent user: {e}")

        logger.warning(f"Authentication failed for email: {email}")
        return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_api(request):
    """
    Log out the user and record the activity.
    Since we use JWT, we can't 'invalidate' the token on server without a blacklist.
    But we can log the action.
    """
    user = request.user
    from admin_page.views import log_activity
    log_activity(
        user_email=user.email,
        action='LOGOUT',
        description='User logged out',
        severity='INFO',
        request=request
    )
    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def profile_api(request):
    from admin_page.serializers import AdminUserSerializer
    user = request.user  # Instance of Admin
    
    if request.method == 'GET':
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        print(f"DEBUG: profile_api PATCH request.data: {request.data}")
        print(f"DEBUG: profile_api Files: {request.FILES}")
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            print("DEBUG: profile_api Save successful")
            return Response({
                "status": "success",
                "message": "Profile updated successfully!",
                "data": serializer.data
            })
        print(f"DEBUG: profile_api Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserSignupView(views.APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.decorators import action

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return unread notifications for the logged-in user (regardless of role)
        return Notification.objects.filter(
            recipient=self.request.user, 
            is_read=False
        ).select_related('patient').order_by('-created_at')

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def clear_by_patient(self, request):
        patient_id = request.data.get('patient_id')
        logger.info(f"clear_by_patient called for patient_id={patient_id} by user={request.user}")
        
        if not patient_id:
            logger.warning("patient_id missing in clear_by_patient request")
            return Response({'error': 'patient_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        count = Notification.objects.filter(
            recipient=request.user,
            patient_id=patient_id,
            is_read=False
        ).update(is_read=True)
        
        logger.info(f"Cleared {count} notifications for user {request.user.email} (patient_id={patient_id})")
        
        return Response({'status': 'notifications cleared for patient'})

class PatientTaskViewSet(viewsets.ModelViewSet):
    serializer_class = PatientTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Allow filtering by patient_id
        queryset = PatientTask.objects.all().select_related('patient').order_by('completed', '-created_at')
        patient_id = self.kwargs.get('patient_pk') # If nested
        if not patient_id:
             patient_id = self.request.query_params.get('patient')

        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        scheduled_date = self.request.query_params.get('date')
        if scheduled_date:
            queryset = queryset.filter(scheduled_date=scheduled_date)

        return queryset

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset.select_related('patient', 'assessed_by').prefetch_related('images').order_by("-id")
        
        # Role-based filtering logic
        filter_type = self.request.query_params.get('filter')
        patient_id = self.request.query_params.get('patient_id')
        
        if filter_type == 'recent_hour':
            from django.utils import timezone
            from datetime import timedelta
            one_hour_ago = timezone.now() - timedelta(hours=1)
            queryset = queryset.filter(created_at__gte=one_hour_ago)
            return queryset
        
        if user.role_type == 'doctor':
            if filter_type == 'my':
                # Show assessments for patients assigned to this doctor
                queryset = queryset.filter(patient__assigned_doctor=user)
            
        elif user.role_type == 'nurse':
            if patient_id:
                # If a specific patient is being viewed, allow the nurse to see assessments
                # to enable history viewing and reduction rate calculations.
                queryset = queryset.filter(patient_id=patient_id)
            else:
                # Nurses only see assessments for patients assigned to them
                queryset = queryset.filter(patient__assigned_nurse=user)
            
        # Apply patient_id filter if provided
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset

    def get_serializer_context(self):
        """Pass request context so ImageField generates absolute Cloudinary URLs."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        logger.info("Assessment submission received: %s", request.data)
        
        # 1. Create Assessment
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            assessment = serializer.save(assessed_by=request.user)
            
            # 2. Process Images
            # Expecting fields like images[0][full], images[0][selected], images[0][annotations]
            # DRF doesn't always handle nested multipart perfectly, so we parse manually if needed
            
            image_indices = set()
            for key in request.data.keys():
                if key.startswith('images['):
                    try:
                        idx = key.split('[')[1].split(']')[0]
                        image_indices.add(idx)
                    except:
                        continue
            
            for idx in sorted(image_indices):
                full_img = request.FILES.get(f'images[{idx}][full]')
                selected_img = request.FILES.get(f'images[{idx}][selected]')
                annotations_raw = request.data.get(f'images[{idx}][annotations]')
                
                annotations = None
                if annotations_raw:
                    try:
                        annotations = json.loads(annotations_raw)
                    except:
                        pass
                
                if full_img:
                    AssessmentImage.objects.create(
                        assessment=assessment,
                        full_image=full_img,
                        selected_area_image=selected_img,
                        annotations=annotations
                    )
            
            # 3. Call Flask ML Service
            try:
                # Use the first image for ML analysis
                first_image = assessment.images.first()
                if first_image and first_image.full_image:
                    import os
                    # Default to localhost if not specified in .env
                    ml_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001/api/predict")
                    
                    # Ensure URL ends with the correct endpoint
                    if not ml_url.endswith("/api/predict"):
                        ml_url = f"{ml_url.rstrip('/')}/api/predict"
                    
                    # Check for ROI/Coordinates in annotations
                    editor_metadata = None
                    if first_image.annotations:
                        # Extract points from polygons (assuming first image's first annotation set)
                        try:
                            # Format expected by ML service: {"boundary_coordinates": [{"x": 10, "y": 20}, ...]}
                            # Adjusting based on how frontend sends annotations (usually a list of points/shapes)
                            coords = first_image.annotations.get('points') or first_image.annotations
                            if isinstance(coords, list):
                                editor_metadata = json.dumps({"boundary_coordinates": coords})
                        except Exception as ann_err:
                            logger.warning(f"Failed to parse annotations for ROI: {ann_err}")
                        
                    with first_image.full_image.open('rb') as img_file:
                        # Use 'image' as the key to match Flask's request.files['image']
                        files = {'image': (first_image.full_image.name, img_file, 'image/jpeg')}
                        data = {}
                        if editor_metadata:
                            data['editor_metadata'] = editor_metadata
                            logger.info("Sending ROI coordinates to ML service")

                        response = requests.post(ml_url, files=files, data=data, timeout=15)
                        
                        if response.status_code == 200:
                            result = response.json()
                            assessment.ml_analysis_result = result
                            
                            # Map Flask response fields to Django model fields
                            assessment.wound_type = result.get('wound_type', assessment.wound_type)
                            assessment.wound_stage = result.get('stage', assessment.wound_stage)
                            assessment.severity = result.get('severity', assessment.severity)
                            assessment.wound_area_cm2 = result.get('wound_area_cm2', assessment.wound_area_cm2)
                            
                            # Tissue Composition Mapping
                            tissue = result.get('tissue_composition', {})
                            if tissue:
                                assessment.granulation_pct = tissue.get('granulation', assessment.granulation_pct)
                                assessment.slough_pct = tissue.get('slough', assessment.slough_pct)
                                assessment.necrotic_pct = tissue.get('necrotic', assessment.necrotic_pct)
                                assessment.epithelial_pct = tissue.get('epithelial', assessment.epithelial_pct)

                            dims = result.get('dimensions', {})
                            if dims:
                                assessment.length = dims.get('length', assessment.length)
                                assessment.width = dims.get('width', assessment.width)
                                assessment.depth = dims.get('depth', assessment.depth)
                            
                            assessment.cure_recommendation = result.get('cure_recommendation', assessment.cure_recommendation)
                            
                            # Use confidence_score and healing_index directly from ML response
                            assessment.confidence_score = result.get('confidence_score', assessment.confidence_score)
                            assessment.healing_index = result.get('healing_index', assessment.healing_index)
                            
                            # Store processing steps
                            assessment.algorithm_analysis = result.get('algorithm_analysis')
                            
                            logger.info(f"Populated AI fields for assessment {assessment.id}: Type={assessment.wound_type}, Severity={assessment.severity}, Area={assessment.wound_area_cm2}cm²")
                            
                            # --- Reduction Rate Calculation ---
                            try:
                                prev_assessment = Assessment.objects.filter(
                                    patient=assessment.patient
                                ).exclude(id=assessment.id).order_by('-created_at').first()
                                
                                if prev_assessment and prev_assessment.length and prev_assessment.width:
                                    prev_area = float(prev_assessment.length) * float(prev_assessment.width)
                                    curr_area = float(assessment.length) * float(assessment.width)
                                    
                                    if prev_area > 0:
                                        reduction = ((prev_area - curr_area) / prev_area) * 100
                                        assessment.reduction_rate = round(reduction, 2)
                                        logger.info(f"Reduction rate calculated: {assessment.reduction_rate}%")
                            except Exception as e:
                                logger.error(f"Failed to calculate reduction rate: {e}")
                            
                            assessment.save()
                        else:
                            logger.error(f"ML Service error: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"Failed to call ML Service: {e}")
 
            # 4. Generate/Regenerate Report (Always do this to ensure it exists with best data)
            try:
                report_success = generate_assessment_report_pdf(assessment.id)
                if report_success:
                    logger.info(f"Automated report generated for assessment {assessment.id}")
                else:
                    logger.error(f"Failed to generate automated report for assessment {assessment.id}")
            except Exception as e:
                logger.error(f"Error during report generation: {e}")
 
            # Log Activity
            try:
                from admin_page.views import log_activity
                log_activity(
                    user_email=request.user.email,
                    action='CREATE',
                    description=f'Created assessment for patient ID {assessment.patient_id}',
                    severity='INFO',
                    request=request
                )
            except Exception as e:
                logger.error(f"Failed to log assessment activity: {e}")

            return Response(AssessmentSerializer(assessment).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def download_report(self, request, pk=None):
        from django.http import FileResponse
        from io import BytesIO
        assessment = self.get_object()
        
        # Regenerate report and get the PDF bytes directly
        pdf_content = generate_assessment_report_pdf(assessment.id)
        
        if pdf_content:
            # Serve the PDF bytes directly from memory without round-trip to Cloudinary
            # This fixes the 401 Unauthorized error by avoiding urllib proxying
            return FileResponse(
                BytesIO(pdf_content), 
                as_attachment=True, 
                filename=f"Assessment_Report_{assessment.id}.pdf",
                content_type='application/pdf'
            )
            
        return Response(
            {"error": "Report is not ready yet. Please try again in a moment."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

from .models import PatientVisit

class PatientVisitViewSet(viewsets.ModelViewSet):
    queryset = PatientVisit.objects.all()
    serializer_class = PatientVisitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset.select_related('patient').order_by("-visit_datetime")
        
        filter_type = self.request.query_params.get('filter')
        patient_id = self.request.query_params.get('patient_id')
        
        if filter_type == 'recent_hour':
            from django.utils import timezone
            from datetime import timedelta
            one_hour_ago = timezone.now() - timedelta(hours=1)
            queryset = queryset.filter(created_at__gte=one_hour_ago)
            return queryset
            
        if user.role_type == 'doctor':
            if filter_type == 'my':
                queryset = queryset.filter(patient__assigned_doctor=user)
        elif user.role_type == 'nurse':
            if filter_type == 'my':
                queryset = queryset.filter(patient__assigned_nurse=user)
                
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset

class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"[Chat] Validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        logger.info(f"Chat POST by {self.request.user.email} for patient {self.request.data.get('patient')} to receiver {self.request.data.get('receiver')}")
        try:
            instance = serializer.save(sender=self.request.user)
            logger.info(f"Chat message saved successfully: ID {instance.id}")
        except Exception as e:
            logger.error(f"Chat message save failed: {str(e)}")
            raise e

    def get_queryset(self):
        user = self.request.user
        patient_id = self.request.query_params.get('patient_id')
        partner_id = self.request.query_params.get('partner_id')
        
        logger.info(f"[Chat] GET params: user={user.email}, patient_id={patient_id}, partner_id={partner_id}")
        
        if not patient_id or not partner_id:
            logger.warning("[Chat] Missing patient_id or partner_id")
            return ChatMessage.objects.none()
            
        # Get messages between user and partner for this patient
        from django.db.models import Q
        queryset = ChatMessage.objects.filter(
            Q(patient_id=patient_id),
            (Q(sender=user, receiver_id=partner_id) | Q(sender_id=partner_id, receiver=user))
        ).select_related('sender', 'receiver').order_by('created_at')
        logger.info(f"[Chat] Found {queryset.count()} messages")
        return queryset

# OTP views commented out as requested
# class OtpSendThrottle(AnonRateThrottle):
#     scope = 'otp_send'
# ...
