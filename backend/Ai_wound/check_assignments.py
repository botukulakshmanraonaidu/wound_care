import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from addpatient.models import Patient
from admin_page.models import Admin

nurses = Admin.objects.filter(role_type='nurse')
for nurse in nurses:
    patients = Patient.objects.filter(assigned_nurse=nurse)
    print(f"Nurse: {nurse.email}, Assigned Patients: {patients.count()}")
    for p in patients:
        print(f"  - Patient: {p.first_name} {p.last_name}")
