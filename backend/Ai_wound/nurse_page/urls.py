from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import NurseTaskViewSet, StaffAnnouncementViewSet, ShiftLogViewSet

router = SimpleRouter()
router.register(r'tasks', NurseTaskViewSet, basename='nurse-tasks')
router.register(r'announcements', StaffAnnouncementViewSet, basename='staff-announcements')
router.register(r'shifts', ShiftLogViewSet, basename='shift-logs')

urlpatterns = [
    path('', include(router.urls)),
]
