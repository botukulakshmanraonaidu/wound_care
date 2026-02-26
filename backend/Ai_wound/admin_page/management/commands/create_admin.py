"""
Management command to create the default admin user.
Run on Render shell: python manage.py create_admin
"""
from django.core.management.base import BaseCommand
from admin_page.models import Admin


class Command(BaseCommand):
    help = 'Creates the default admin user if it does not exist'

    def handle(self, *args, **options):
        email = 'lakshman@hospital.com'
        password = 'lakshman@123'

        if Admin.objects.filter(email=email).exists():
            # User exists — reset the password to ensure it works
            user = Admin.objects.get(email=email)
            user.set_password(password)
            user.raw_password = password
            user.role_type = 'admin'
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.access_level = 'Full'
            user.save()
            self.stdout.write(self.style.WARNING(
                f'Admin "{email}" already exists — password has been RESET.'
            ))
        else:
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
                raw_password=password,
            )
            self.stdout.write(self.style.SUCCESS(
                f'Admin "{email}" created successfully!'
            ))
