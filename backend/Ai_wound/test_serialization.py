import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from admin_page.models import Admin
from admin_page.serializers import AdminUserSerializer

try:
    users = Admin.objects.all()
    print(f"Total users in DB: {users.count()}")
    
    serializer = AdminUserSerializer(users, many=True)
    data = serializer.data
    print(f"Serialized users count: {len(data)}")
    
    if len(data) > 0:
        print("First user keys:", data[0].keys())
        # print("First user data:", data[0])
except Exception as e:
    print(f"Error during serialization: {e}")
    import traceback
    traceback.print_exc()
