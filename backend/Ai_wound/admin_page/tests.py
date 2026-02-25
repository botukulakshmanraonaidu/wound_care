from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from admin_page.models import Admin, ActivityLog

class AdminTests(APITestCase):
    def setUp(self):
        # Create a superuser/admin
        self.admin = Admin.objects.create_superuser(
            email='admin@mediwound.com', password='adminpassword', 
            role_type='admin', full_name='System Admin'
        )
        self.client.force_authenticate(user=self.admin)

    def test_user_creation_and_logging(self):
        """Verify that an admin can create a new user and it gets logged."""
        url = reverse('user-create')
        data = {
            "email": "newuser@mediwound.com",
            "password": "newpassword123",
            "confirm_password": "newpassword123",  # Required by serializer
            "full_name": "New Developer",
            "role_type": "doctor",
            "job_title": "Wound Specialist",
            "department": "Wound Care",
            "specialization": "Dermatology",
            "license_id": "LIC12345",
            "admin_email": self.admin.email
        }
        response = self.client.post(url, data, format='json')
        if response.status_code != status.HTTP_201_CREATED:
            print(f"User Creation Failed: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify activity log entry
        log = ActivityLog.objects.filter(action='CREATE', target_user="New Developer").first()
        self.assertIsNotNone(log)

    def test_activity_log_retrieval(self):
        """Verify that activity logs can be retrieved via API."""
        ActivityLog.objects.create(
            user_email=self.admin.email,
            action="CREATE",
            description="Testing the logs"
        )
        url = reverse('activity-log-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if response.data is a list (no pagination) or dict (pagination)
        if isinstance(response.data, dict) and 'results' in response.data:
            logs = response.data['results']
        else:
            logs = response.data
            
        self.assertTrue(len(logs) >= 1)
