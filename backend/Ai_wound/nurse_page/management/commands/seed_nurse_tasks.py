from django.core.management.base import BaseCommand
from nurse_page.models import NurseTask
from admin_page.models import Admin
from addpatient.models import Patient
import random

class Command(BaseCommand):
    help = 'Seeds project-specific tasks for nurses'

    def handle(self, *args, **options):
        nurses = Admin.objects.filter(role_type='nurse')
        
        if not nurses.exists():
            self.stdout.write(self.style.WARNING("No nurses found in the database. Please create a nurse user first."))
            return

        # Define project-specific clinical tasks
        task_templates = [
            {
                "title": "Perform Wound Photography",
                "description": "Capture high-resolution images of active wound sites for AI analysis.",
                "due_time": "Today, 10:00 AM"
            },
            {
                "title": "Recalculate Measurement",
                "description": "Verify AI-extracted wound dimensions and manually adjust if necessary.",
                "due_time": "Today, 11:30 AM"
            },
            {
                "title": "Sync Vital Signs",
                "description": "Record temperature, BP, and SpO2 for patient status monitoring.",
                "due_time": "Today, 01:00 PM"
            },
            {
                "title": "Review Physician Chat",
                "description": "Check for new clinical instructions or clarifications from the lead doctor.",
                "due_time": "Today, 03:00 PM"
            },
            {
                "title": "Update Dressing Status",
                "description": "Log dressing type and time of change for wound moisture management.",
                "due_time": "Today, 05:00 PM"
            }
        ]

        # Clear old tasks to avoid clutter (optional, but good for "updating" feel)
        NurseTask.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Cleared existing nurse tasks."))

        created_count = 0
        for nurse in nurses:
            # Assign some tasks to each nurse
            # Optionally link to a patient they are assigned to
            assigned_patients = list(Patient.objects.filter(assigned_nurse=nurse))
            
            self.stdout.write(f"Seeding tasks for nurse: {nurse.email} (Assigned patients: {len(assigned_patients)})")
            
            for template in task_templates:
                patient = random.choice(assigned_patients) if assigned_patients else None
                
                NurseTask.objects.create(
                    nurse=nurse,
                    patient=patient,
                    title=template["title"],
                    description=template["description"],
                    due_time=template["due_time"],
                    status='pending'
                )
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} clinical tasks for {nurses.count()} nurses."))
