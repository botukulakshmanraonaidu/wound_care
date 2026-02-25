import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
django.setup()

from addpatient.models import Assessment, AssessmentImage
from admin_page.models import SystemFile
from django.db import transaction

def get_size_str(file_field):
    try:
        size_bytes = file_field.size
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
    except Exception as e:
        return "Unknown"

def backfill():
    print("Starting backfill of system files...")
    
    # 1. Backfill Assessment Images
    images = AssessmentImage.objects.all()
    img_count = 0
    for img in images:
        if not img.full_image:
            continue
            
        p = img.assessment.patient
        name = f"Wound Image - {p.first_name} {p.last_name} (#{img.assessment.id})"
        # Check if already exists
        if not SystemFile.objects.filter(file=img.full_image).exists():
            ext = os.path.splitext(img.full_image.name)[1].upper().replace('.', '') or 'IMG'
            SystemFile.objects.create(
                name=name,
                file=img.full_image,
                uploaded_by=img.assessment.assessed_by,
                size=get_size_str(img.full_image),
                file_type=ext
            )
            img_count += 1
            print(f"Synced Image: {name}")

    # 2. Backfill Assessment Reports
    assessments = Assessment.objects.filter(report_file__isnull=False).exclude(report_file='')
    rpt_count = 0
    for rpt in assessments:
        p = rpt.patient
        name = f"Report - {p.first_name} {p.last_name} ({rpt.created_at.date()})"
        # Check if already exists
        if not SystemFile.objects.filter(file=rpt.report_file).exists():
            SystemFile.objects.create(
                name=name,
                file=rpt.report_file,
                uploaded_by=rpt.assessed_by,
                size=get_size_str(rpt.report_file),
                file_type="PDF"
            )
            rpt_count += 1
            print(f"Synced Report: {name}")

    print(f"Backfill complete! Synced {img_count} images and {rpt_count} reports.")

if __name__ == "__main__":
    backfill()
