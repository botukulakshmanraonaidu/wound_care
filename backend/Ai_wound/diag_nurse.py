import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from nurse_page.models import NurseTask
from admin_page.models import Admin

nurses = Admin.objects.filter(role_type='nurse')
print(f"DEBUG: Found {nurses.count()} nurses")
for n in nurses:
    tasks = NurseTask.objects.filter(nurse=n)
    print(f"Nurse: {n.email} ({n.full_name}) - Tasks: {tasks.count()}")
    for t in tasks:
        p_info = f"Patient: {t.patient.first_name if t.patient else 'None'}"
        print(f"  - [{t.status}] {t.title} ({p_info})")
