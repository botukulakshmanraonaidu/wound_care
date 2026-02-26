import os
from django.conf import settings
from django.template.loader import render_to_string
try:
    from xhtml2pdf import pisa
except ImportError:
    pisa = None
    print("Warning: xhtml2pdf not found. PDF generation will be disabled.")
from io import BytesIO
from django.core.files.base import ContentFile
from .models import Assessment

def link_callback(uri, rel):
    """
    Convert HTML URIs to absolute system paths so xhtml2pdf can access those
    resources
    """
    # For media files
    if uri.startswith(settings.MEDIA_URL):
        path = os.path.join(settings.MEDIA_ROOT, uri.replace(settings.MEDIA_URL, ""))
    elif uri.startswith(settings.STATIC_URL):
        # In development, try STATICFILES_DIRS if STATIC_ROOT is empty or file not found
        rel_path = uri.replace(settings.STATIC_URL, "")
        
        # Try STATIC_ROOT first
        path = os.path.join(settings.STATIC_ROOT, rel_path) if settings.STATIC_ROOT else None
        
        if not path or not os.path.isfile(path):
            path = os.path.join(settings.BASE_DIR, "static", rel_path)

    elif uri.startswith('http://') or uri.startswith('https://'):
        # Dynamic download of remote Cloudinary images for PDF embedding
        import urllib.request
        import hashlib
        
        # Create a cache directory for temporary report images
        cache_dir = os.path.join(settings.MEDIA_ROOT, 'temp_report_assets')
        os.makedirs(cache_dir, exist_ok=True)
        
        # Unique filename based on URL hash
        ext = os.path.splitext(uri)[1] or '.jpg'
        local_filename = hashlib.md5(uri.encode()).hexdigest() + ext
        path = os.path.join(cache_dir, local_filename)
        
        if not os.path.exists(path):
            try:
                urllib.request.urlretrieve(uri, path)
            except Exception as e:
                print(f"Failed to download remote asset for PDF: {uri} - {e}")
                return uri
    else:
        return uri

    # make sure that file exists
    if not os.path.isfile(path):
        return uri
    return path

def generate_assessment_report_pdf(assessment_id):
    """
    Generates a PDF report for a given assessment and saves it to the model.
    """
    try:
        assessment = Assessment.objects.select_related('patient', 'assessed_by').get(id=assessment_id)
        patient = assessment.patient
        
        # Context for the template
        context = {
            'assessment': assessment,
            'patient': patient,
            'doctor': assessment.assessed_by,
            'ml_result': assessment.ml_analysis_result or {},
            'images': assessment.images.all(),
            'report_date': assessment.created_at.strftime('%m/%d/%Y, %I:%M:%S %p'),
        }
        
        # Render HTML
        html_string = render_to_string('reports/assessment_report.html', context)
        
        # Create PDF
        if pisa is None:
            print("Error: pisa is not installed. Cannot generate PDF.")
            return False
            
        result = BytesIO()
        pdf = pisa.pisaDocument(
            BytesIO(html_string.encode("UTF-8")), 
            result,
            link_callback=link_callback
        )
        
        if not pdf.err:
            filename = f"assessment_report_{assessment_id}.pdf"
            pdf_content = result.getvalue()
            
            # Ensure we overwrite/update the file in Cloudinary
            assessment.report_file.save(filename, ContentFile(pdf_content), save=True)
            return pdf_content
            
        print(f"Pisa Error: {pdf.err}")
        return None
    except Exception as e:
        print(f"Error generating PDF for ID {assessment_id}: {e}")
        import traceback
        traceback.print_exc()
        return None
