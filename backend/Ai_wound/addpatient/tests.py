from django.urls import reverse
import os
from rest_framework import status
from rest_framework.test import APITestCase
from addpatient.models import Patient, Assessment, Notification
from admin_page.models import Admin

class PatientTests(APITestCase):
    def setUp(self):
        # Create a doctor for creation tests
        self.doctor = Admin.objects.create_user(
            email='doctor@example.com',
            password='password123',
            role_type='doctor',
            full_name='Doctor Name'
        )
        # Create a nurse for assignment tests
        self.nurse = Admin.objects.create_user(
            email='nurse@example.com',
            password='password123',
            role_type='nurse'
        )
        self.client.force_authenticate(user=self.doctor)

    def test_create_patient_with_contact_info(self):
        """Verify that a patient can be created with all required and contact info fields."""
        url = reverse('patient-list')
        data = {
            "first_name": "Satyam",
            "last_name": "Rajesh",
            "dob": "1990-01-01",
            "gender": "Male",
            "admission_date": "2023-10-01",
            "ward": "General Surgery",
            "room": "204-B",
            "physician": "Dr. Smith",
            "diagnosis": "Diabetic Foot Ulcer",
            "contact_number": "6305913197",
            "address": "Dornala, Prakasam dist, Andhra Pradesh",
            "emergency_contact_name": "Krishna Ram",
            "emergency_contact_number": "9281070855"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 1)
        
        patient = Patient.objects.get()
        self.assertEqual(patient.first_name, "Satyam")
        self.assertEqual(patient.contact_number, "6305913197")
        self.assertEqual(patient.address, "Dornala, Prakasam dist, Andhra Pradesh")

    def test_create_patient_auto_assignment(self):
        """Verify that a patient created by a doctor is auto-assigned to that doctor."""
        url = reverse('patient-list')
        data = {
            "first_name": "Auto",
            "last_name": "Assign",
            "dob": "1990-01-01",
            "gender": "Male",
            "admission_date": "2023-10-01",
            "ward": "General Surgery",
            "room": "101",
            "physician": "Dr. Self",
            "diagnosis": "Wound"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        patient = Patient.objects.get(first_name="Auto")
        self.assertEqual(patient.assigned_doctor, self.doctor)

    def test_notification_on_assignment(self):
        """Verify that a notification is created when a nurse is assigned via the signal."""
        # 1. Create a patient with all required fields (using model fields here as we use objects.create)
        patient = Patient.objects.create(
            first_name="Signal", last_name="Test", 
            date_of_birth="2000-01-01", gender="Other",
            admission_date="2023-10-01", ward_department="ICU",
            room_bed_number="101", assigning_physician="Dr. House",
            primary_diagnosis="Critical Condition"
        )
        
        # 2. Assign nurse (simulating selection from admin/doctor)
        patient.assigned_nurse = self.nurse
        patient.save()
        
        # 3. Verify notification exists (triggered by post_save signal)
        notification = Notification.objects.filter(recipient=self.nurse, patient=patient).first()
        self.assertIsNotNone(notification)
        self.assertIn("assigned to the wound care team", notification.message)

class AssessmentTests(APITestCase):
    def setUp(self):
        self.doctor = Admin.objects.create_user(
            email='testdoc@example.com', password='password123', role_type='doctor'
        )
        self.patient = Patient.objects.create(
            first_name="Alice", last_name="Wound", date_of_birth="1985-05-05", gender="Female",
            admission_date="2023-10-01", ward_department="Burn Unit",
            room_bed_number="302", assigning_physician="Dr. Strange",
            primary_diagnosis="Burn Injury"
        )
        self.client.force_authenticate(user=self.doctor)

    def test_create_assessment(self):
        """Verify that an assessment can be created via API."""
        url = reverse('assessments-list')
        data = {
            "patient": self.patient.id,
            "wound_type": "pressure_ulcer",
            "wound_stage": "Stage 2",
            "length": "5.5",
            "width": "3.2",
            "notes": "Healing well."
        }
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        assessment = Assessment.objects.get(id=response.data['id'])
        self.assertEqual(assessment.wound_type, data["wound_type"])

    def test_report_generation(self):
        """Verify that a report can be generated and downloaded."""
        assessment = Assessment.objects.create(
            patient=self.patient,
            assessed_by=self.doctor,
            wound_type="diabetic_ulcer",
            wound_stage="Stage 1",
            length=2.0,
            width=2.0
        )
        
        url = reverse('assessments-download-report', kwargs={'pk': assessment.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Verify file exists on disk
        assessment.refresh_from_db()
        self.assertTrue(bool(assessment.report_file))
        self.assertTrue(os.path.exists(assessment.report_file.path))

class AuthTests(APITestCase):
    def test_login_flow(self):
        """Verify that a user can login and receive a JWT token."""
        user = Admin.objects.create_user(
            email='login@test.com', password='secretpassword', 
            role_type='doctor', full_name='Login Doc'
        )
        url = reverse('login')
        data = {"email": "login@test.com", "password": "secretpassword"}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
