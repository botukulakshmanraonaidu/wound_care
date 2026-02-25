from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    PatientViewSet, login_api, logout_api, profile_api, UserSignupView, 
    NotificationViewSet, PatientTaskViewSet, AssessmentViewSet, ChatMessageViewSet
)
from rest_framework_simplejwt.views import TokenRefreshView

router = SimpleRouter()
router.register(r'api/patients/notifications', NotificationViewSet, basename='notification')
router.register(r'api/patients', PatientViewSet, basename="patient")
router.register(r'api/tasks', PatientTaskViewSet, basename='tasks')
router.register(r'api/patients/(?P<patient_pk>\d+)/tasks', PatientTaskViewSet, basename='patient-tasks')
router.register(r'api/assessments', AssessmentViewSet, basename='assessments')
router.register(r'api/chat', ChatMessageViewSet, basename='chat')

urlpatterns = [
    path('', include(router.urls)),
    path("api/auth/signup/", UserSignupView.as_view(), name="signup"),
    path("api/auth/login/", login_api, name="login"),
    path("api/auth/logout/", logout_api, name="logout"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/profile/", profile_api),
]
