import os
import django
import sys

# Add the project root to sys.path
sys.path.append('d:/wound care/wound_analysis/backend/Ai_wound')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from admin_page.models import ActivityLog

print("Checking last 10 Activity Logs:")
logs = ActivityLog.objects.all().order_by('-timestamp')[:10]

if not logs.exists():
    print("No logs found.")
else:
    for log in logs:
        print(f"ID: {log.id} | User: {log.user_email} | Action: {log.action} | IP: {log.ip_address} | Time: {log.timestamp}")
