import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from admin_page.models import Admin
from django.contrib.auth import authenticate

email = 'lakshman@hospital.com'
password = 'lakshman@123'

user = Admin.objects.filter(email=email).first()

if not user:
    print(f"❌ User {email} does not exist.")
else:
    print(f"✅ User {email} exists.")
    print(f"   - Is Active: {user.is_active}")
    print(f"   - Is Staff: {user.is_staff}")
    print(f"   - Is Superuser: {user.is_superuser}")
    print(f"   - Role Type: '{user.role_type}'")
    print(f"   - Full Name: '{user.full_name}'")
    
    auth_user = authenticate(username=email, password=password)
    if auth_user:
        print("✅ Authentication successful!")
    else:
        print("❌ Authentication FAILED with the provided password.")
        # Check if password matches manually (just in case authenticate has backend issues)
        if user.check_password(password):
            print("   ⚠️ Password matches via check_password(), but authenticate() failed.")
        else:
            print("   ❌ Password does not match.")
