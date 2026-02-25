from datetime import datetime

def generate_mrn():
    from .models import Patient
    today = datetime.now().strftime('%Y%m%d')

    last_patient = Patient.objects.filter(
        mrn__startswith=f"MRN{today}"
    ).order_by('-mrn').first()

    if last_patient:
        try:
            last_sequence = int(last_patient.mrn[-4:])
            new_sequence = last_sequence + 1
        except (ValueError, TypeError):
            new_sequence = 1
    else:
        new_sequence = 1

    return f"MRN{today}{str(new_sequence).zfill(4)}"
