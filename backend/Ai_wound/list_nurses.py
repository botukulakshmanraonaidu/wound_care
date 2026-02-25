import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from admin_page.models import Admin
nurses = Admin.objects.filter(role_type='nurse')
for n in nurses:
    print(f"NURSE_EMAIL: {n.email}")
