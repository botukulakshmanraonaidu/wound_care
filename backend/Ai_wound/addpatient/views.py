from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
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
    ChatMessageSerializer
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
        
        if user.role_type == 'doctor':
            if filter_type == 'my':
                # Return only assigned patients
                return queryset.filter(assigned_doctor=user)
            # Doctors can see the list of all patients
            return queryset
            
        if user.role_type == 'nurse':
            # Nurses should ONLY see their assigned patients in the dashboard context
            return queryset.filter(assigned_nurse=user)
            
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

from rest_framework_simplejwt.tokens import RefreshToken

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
    logger.info(f"DEBUG: Login attempt for email=[{email}]")

    if not email or not password:
        logger.warning("DEBUG: Missing email or password")
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=email, password=password)
    logger.info(f"DEBUG: Authenticate result for [{email}]: {user}")

    if user:
        logger.info(f"Successful login for: {email}")
        logger.info(f"User authenticated successfully: {email}")
        
        # Log successful login
        try:
            from admin_page.views import log_activity
            log_activity(
                user_email=user.email,
                action='LOGIN',
                description='User logged in successfully',
                severity='INFO'
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
        severity='INFO'
    )
    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_api(request):
    user = request.user  # Instance of Admin
    
    if request.method == 'GET':
        return Response({
            "id": user.id,
            "email": user.email,
            "full_name": getattr(user, 'full_name', ''),
            "role": getattr(user, 'role_type', 'doctor'),
            "access_level": getattr(user, 'access_level', 'Limited'),
            "job_title": getattr(user, 'job_title', ''),
            "specialization": getattr(user, 'specialization', ''),
            "is_active": user.is_active,
        })
    
    elif request.method == 'PATCH':
        data = request.data
        user.full_name = data.get('full_name', user.full_name)
        
        password = data.get('password')
        if password:
            user.set_password(password)
            
        user.save()
        
        return Response({
            "message": "Profile updated successfully",
            "full_name": user.full_name
        }, status=status.HTTP_200_OK)

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
        
        if user.role_type == 'doctor':
            if filter_type == 'my':
                # Show assessments for patients assigned to this doctor
                queryset = queryset.filter(patient__assigned_doctor=user)
            
        elif user.role_type == 'nurse':
            # Nurses strictly see only their assigned patients' assessments
            queryset = queryset.filter(patient__assigned_nurse=user)
            
        # Apply patient_id filter if provided
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset

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
            
            # 3. Call FastAPI ML Service
            try:
                # Use the first image for ML analysis
                first_image = assessment.images.first()
                if first_image and first_image.full_image:
                    ml_url = "http://localhost:8001/analyze-wound"
                    with first_image.full_image.open('rb') as img_file:
                        files = {'file': (first_image.full_image.name, img_file, 'image/jpeg')}
                        response = requests.post(ml_url, files=files, timeout=10)
                        
                        if response.status_code == 200:
                            result = response.json()
                            assessment.ml_analysis_result = result
                            assessment.cure_recommendation = result.get('cure_recommendation')
                            
                            # Strictly populate model fields from ML results to prevent manual override
                            dims = result.get('dimensions', {})
                            assessment.length = dims.get('length', assessment.length)
                            assessment.width = dims.get('width', assessment.width)
                            assessment.depth = dims.get('depth', assessment.depth)
                            
                            assessment.wound_type = result.get('wound_type', assessment.wound_type)
                            assessment.wound_stage = result.get('stage', assessment.wound_stage)
                            assessment.confidence_score = result.get('confidence_score')
                            assessment.healing_index = result.get('healing_index')
                            assessment.algorithm_analysis = result.get('algorithm_analysis')
                            
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
                            logger.info(f"ML Analysis completed and fields populated for assessment {assessment.id}")
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
                    severity='INFO'
                )
            except Exception as e:
                logger.error(f"Failed to log assessment activity: {e}")

            return Response(AssessmentSerializer(assessment).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def download_report(self, request, pk=None):
        assessment = self.get_object()
        # Always generate/re-generate to ensure it's up to date with latest data
        generate_assessment_report_pdf(assessment.id)
        assessment.refresh_from_db()
        
        if assessment.report_file:
            from django.http import FileResponse
            return FileResponse(assessment.report_file.open(), as_attachment=True, content_type='application/pdf')
        
        return Response({"error": "Report not available"}, status=status.HTTP_404_NOT_FOUND)

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
