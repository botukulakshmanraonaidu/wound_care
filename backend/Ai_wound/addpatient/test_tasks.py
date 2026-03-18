from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from addpatient.models import Patient, PatientTask
from admin_page.models import Admin

class PatientTaskDetailTests(APITestCase):
    def setUp(self):
        self.doctor = Admin.objects.create_user(
            email='doctor_task@example.com',
            password='password123',
            role_type='doctor',
            full_name='Doctor Task'
        )
        self.patient = Patient.objects.create(
            first_name="Task", last_name="Patient", 
            date_of_birth="1990-01-01", gender="Male",
            admission_date="2023-10-01", ward_department="Surgery",
            room_bed_number="101", assigning_physician="Dr. Smith",
            primary_diagnosis="Testing"
        )
        self.client.force_authenticate(user=self.doctor)

    def test_create_task_with_details(self):
        """Verify that a task can be created with description and priority."""
        url = reverse('patienttask-list')
        data = {
            "patient": self.patient.id,
            "title": "Complex Task",
            "description": "This is a detailed description of the task.",
            "priority": "High",
            "due": "Today, 10:00 PM",
            "completed": False
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        task = PatientTask.objects.get(id=response.data['id'])
        self.assertEqual(task.description, "This is a detailed description of the task.")
        self.assertEqual(task.priority, "High")
        self.assertEqual(task.due, "Today, 10:00 PM")

    def test_update_task_status_boolean(self):
        """Verify that task completion can be toggled using boolean."""
        task = PatientTask.objects.create(
            patient=self.patient,
            title="Toggle Task",
            completed=False
        )
        url = reverse('patienttask-detail', kwargs={'pk': task.id})
        
        # Toggle to True
        response = self.client.patch(url, {"completed": True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertTrue(task.completed)
        
        # Toggle back to False
        response = self.client.patch(url, {"completed": False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertFalse(task.completed)
