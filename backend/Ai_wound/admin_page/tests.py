from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from admin_page.models import Admin, ActivityLog

class AdminTests(APITestCase):
    def setUp(self):
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

    def test_user_creation_duplicate_phone(self):
        """Verify that creating a user with an existing phone number fails."""
        # First, create a user with a phone number
        Admin.objects.create_user(
            email='user1@mediwound.com', password='password123',
            full_name='User One', role_type='nurse',
            phone_number='1234567890',
            job_title='Nurse', department='Wound Care',
            ward='A', shift='Day'
        )

        url = reverse('user-create')
        data = {
            "email": "user2@mediwound.com",
            "password": "password123",
            "confirm_password": "password123",
            "full_name": "User Two",
            "role_type": "nurse",
            "phone_number": "1234567890", # Duplicate
            "job_title": "Nurse",
            "department": "Wound Care",
            "ward": "B",
            "shift": "Night",
            "admin_email": self.admin.email
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # DRF default or custom message - checking for substring
        self.assertTrue(
            "already in use" in str(response.data) or 
            "already exists" in str(response.data)
        )

    def test_user_update_duplicate_phone(self):
        """Verify that updating a user with another user's phone number fails."""
        # Create user 1
        user1 = Admin.objects.create_user(
            email='u1@mediwound.com', password='password123',
            full_name='U1', role_type='nurse',
            phone_number='1111111111',
            job_title='Nurse', department='Wound Care',
            ward='A', shift='Day'
        )
        # Create user 2
        user2 = Admin.objects.create_user(
            email='u2@mediwound.com', password='password123',
            full_name='U2', role_type='nurse',
            phone_number='2222222222',
            job_title='Nurse', department='Wound Care',
            ward='B', shift='Night'
        )

        # Update user 2 with user 1's phone number
        url = reverse('user-detail', args=[user2.id])
        data = {
            "phone_number": "1111111111" # Duplicate of user 1
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            "already in use" in str(response.data) or 
            "already exists" in str(response.data)
        )

    def test_user_update_own_phone(self):
        """Verify that a user can update their profile while keeping their own phone number."""
        user = Admin.objects.create_user(
            email='u3@mediwound.com', password='password123',
            full_name='U3', role_type='nurse',
            phone_number='3333333333',
            job_title='Nurse', department='Wound Care',
            ward='A', shift='Day'
        )

        url = reverse('user-detail', args=[user.id])
        data = {
            "full_name": "U3 Updated",
            "phone_number": "3333333333" # Same as before
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.full_name, "U3 Updated")
