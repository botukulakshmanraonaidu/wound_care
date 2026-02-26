from django.apps import AppConfig


class AdminPageConfig(AppConfig):
    name = 'admin_page'

    def ready(self):
        # Only run in the main process (skip management commands or reloader)
        import sys
        if 'runserver' not in sys.argv and 'manage.py' not in sys.argv:
            try:
                self.create_default_admin()
            except Exception:
                pass # Silently fail to avoid crashing startup

    def create_default_admin(self):
        from .models import Admin
        email = 'lakshman@hospital.com'
        password = 'lakshman@123'
        
        if not Admin.objects.filter(email=email).exists():
            Admin.objects.create_user(
                email=email,
                password=password,
                full_name='Lakshman Rao',
                role_type='admin',
                job_title='System Administrator',
                department='IT',
                access_level='Full',
                is_staff=True,
                is_superuser=True,
                raw_password=password
            )
