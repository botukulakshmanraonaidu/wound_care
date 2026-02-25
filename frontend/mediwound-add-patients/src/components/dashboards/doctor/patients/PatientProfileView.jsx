import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../../../../services/patientService';
import PatientProfile from './PatientProfile';

const PatientProfileView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mock user object - in a real app, this would come from AuthContext
    const user = {
        id: localStorage.getItem('userId'),
        name: localStorage.getItem('userName'),
        username: localStorage.getItem('email'),
        role: (localStorage.getItem('userRole') || 'DOCTOR').toUpperCase()
    };

    useEffect(() => {
        const fetchPatient = async () => {
            try {
                setLoading(true);
                const data = await patientService.getPatientById(id);
                // Map frontend properties back to what the user's component expects if necessary
                // The user's component uses patient.name, patient.mrn, patient.dob, patient.bed/bed_number, etc.
                const mappedPatient = {
                    ...data,
                    name: `${data.firstName} ${data.lastName}`,
                    bed: data.roomNumber || 'Unassigned',
                    dob: data.dateOfBirth
                };
                setPatient(mappedPatient);
            } catch (err) {
                console.error('Failed to fetch patient:', err);
                setError('Failed to load patient profile.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPatient();
        }
    }, [id]);

    const handleBack = () => navigate('/patients');
    const handleNewAssessment = () => {
        // Save state to sessionStorage for ClinicalPortal to pick up
        sessionStorage.setItem('portal_activeTab', 'assessments');
        sessionStorage.setItem('portal_isCreatingAssessment', 'true');
        sessionStorage.setItem('portal_selectedPatient', JSON.stringify(patient));

        navigate('/clinical-portal');
    };
    const handleEditPatient = (p) => navigate(`/patients/edit/${p.id}`);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading patient profile...
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                {error || 'Patient not found.'}
                <br />
                <button
                    onClick={handleBack}
                    style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    Back to Patients
                </button>
            </div>
        );
    }

    return (
        <PatientProfile
            patient={patient}
            onBack={handleBack}
            onNewAssessment={handleNewAssessment}
            onEditPatient={handleEditPatient}
            user={user}
            onNotificationRefresh={() => window.dispatchEvent(new Event('refreshNotifications'))}
        />
    );
};

export default PatientProfileView;
