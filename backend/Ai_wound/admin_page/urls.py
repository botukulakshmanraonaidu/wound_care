from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    CreateAdminAPIView, 
    UserListAPIView, 
    UserDetailAPIView, 
    ActivityLogViewSet, 
    SystemStatsAPIView,
    SystemFileViewSet,
    SystemStorageStatsAPIView
)

router = SimpleRouter()
router.register(r'logs', ActivityLogViewSet, basename='activity-log')
router.register(r'files', SystemFileViewSet, basename='system-file')

urlpatterns = [
    path('users/', UserListAPIView.as_view(), name='user-list'),
    path('users/create/', CreateAdminAPIView.as_view(), name='user-create'),
    path('users/<int:pk>/', UserDetailAPIView.as_view(), name='user-detail'),
    path('stats/', SystemStatsAPIView.as_view(), name='system-stats'),
    path('storage-stats/', SystemStorageStatsAPIView.as_view(), name='storage-stats'),
    path('', include(router.urls)),
]
