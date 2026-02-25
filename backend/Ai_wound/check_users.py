import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from admin_page.models import Admin

users = Admin.objects.all()
print(f"Total Users: {users.count()}")
for u in users:
    print(f"User: {u.email}, Role: {u.role_type}, Full Name: {u.full_name}")
