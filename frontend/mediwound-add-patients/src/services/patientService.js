import AuthAPI from '../API/authApi';

// Helper to map frontend (React) field names to backend (Django) field names
const mapToBackend = (data) => ({
    first_name: data.firstName,
    last_name: data.lastName,
    dob: data.dateOfBirth,
    gender: data.gender,
    status: data.status,
    admission_date: data.admissionDate,
    ward: data.ward,
    room: data.roomNumber || 'N/A', // Fallback for missing fields
    physician: data.assigningPhysician || 'N/A',
    diagnosis: data.primaryDiagnosis || 'N/A',
    last_visit: data.lastVisit,
    contact_number: data.contactNumber,
    address: data.address,
    emergency_contact_name: data.emergencyContactName,
    emergency_contact_number: data.emergencyContactNumber,
    assigned_doctor_id: data.assigned_doctor_id
});

// Helper to map backend (Django) field names back to frontend (React) field names
const mapFromBackend = (data) => ({
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    mrn: data.mrn,
    dateOfBirth: data.dob,
    gender: data.gender,
    status: data.status,
    lastVisit: data.last_visit,
    admissionDate: data.admission_date,
    ward: data.ward,
    roomNumber: data.room,
    assigningPhysician: data.physician,
    primaryDiagnosis: data.diagnosis,
    contactNumber: data.contact_number,
    address: data.address,
    emergencyContactName: data.emergency_contact_name,
    emergencyContactNumber: data.emergency_contact_number,
    assignedDoctor: data.assigned_doctor,
    assignedNurse: data.assigned_nurse
});

export const patientService = {
    getPatients: async (filter = 'all') => {
        try {
            const response = await AuthAPI.get(`api/patients/?filter=${filter}`);
            return response.data.map(mapFromBackend);
        } catch (error) {
            console.error('Error fetching patients:', error);
            return [];
        }
    },

    getPatientById: async (id) => {
        try {
            const response = await AuthAPI.get(`api/patients/${id}/`);
            return mapFromBackend(response.data);
        } catch (error) {
            console.error('Error fetching patient:', error);
            throw error;
        }
    },

    addPatient: async (patientData) => {
        try {
            const backendData = mapToBackend(patientData);
            const response = await AuthAPI.post('api/patients/', backendData);
            return mapFromBackend(response.data);
        } catch (error) {
            console.error('Error adding patient:', error);
            throw error;
        }
    },

    updatePatient: async (id, patientData) => {
        try {
            const backendData = mapToBackend(patientData);
            const response = await AuthAPI.put(`api/patients/${id}/`, backendData);
            return mapFromBackend(response.data);
        } catch (error) {
            console.error('Error updating patient:', error);
            throw error;
        }
    },

    getPatientAssessments: async (patientId) => {
        try {
            const response = await AuthAPI.get(`api/assessments/?patient_id=${patientId}`);
            const data = response.data || [];
            // Sort newest first regardless of backend ordering
            return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            console.error('Error fetching patient assessments:', error);
            return [];
        }
    },

    clearNotifications: async (patientId) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            await AuthAPI.post('api/patients/notifications/clear_by_patient/', {
                patient_id: patientId
            });

            // Force Navbar update
            window.dispatchEvent(new Event('refreshNotifications'));
        } catch (error) {
            console.error('Error clearing notifications:', error);
            // We don't throw here to avoid blocking navigation if this fails
        }
    },

    getRecentNotifications: async () => {
        try {
            const response = await AuthAPI.get(`api/patients/notifications/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching recent notifications:', error);
            return [];
        }
    }
};
