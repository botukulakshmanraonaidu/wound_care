import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from nurse_page.models import NurseTask
from admin_page.models import Admin

print(f"Total NurseTasks: {NurseTask.objects.count()}")
for task in NurseTask.objects.all()[:10]:
    patient_name = f"{task.patient.first_name} {task.patient.last_name}" if task.patient else "None"
    print(f"Task: {task.title}, Nurse: {task.nurse.email}, Patient: {patient_name}, Status: {task.status}")

nurses = Admin.objects.filter(role_type='nurse')
print(f"Total Nurses: {nurses.count()}")
for nurse in nurses:
    task_count = NurseTask.objects.filter(nurse=nurse).count()
    print(f"Nurse: {nurse.email}, Tasks: {task_count}")
