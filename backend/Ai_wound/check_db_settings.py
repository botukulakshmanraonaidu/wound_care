import os
import django
from django.conf import settings

# Set the settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')

# Setup Django
django.setup()

# Print DATABASES configuration
print("DATABASES configuration:")
for alias, config in settings.DATABASES.items():
    print(f"Alias: {alias}")
    print(f"  ENGINE: {config.get('ENGINE')}")
    print(f"  OPTIONS: {config.get('OPTIONS')}")
