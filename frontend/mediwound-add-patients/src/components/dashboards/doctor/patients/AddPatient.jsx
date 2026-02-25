import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, User, Building2, Calendar, Save, X, Search } from 'lucide-react';
import axios from 'axios';
import AuthAPI from '../../../../API/authApi';
import { patientService } from '../../../../services/patientService';
import './AddPatient.css';

const AddPatient = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const userRole = localStorage.getItem('userRole');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        admissionDate: new Date().toISOString().split('T')[0],
        ward: '',
        status: 'Active',
        roomNumber: '',
        assigningPhysician: '',
        primaryDiagnosis: '',
        lastVisit: '',
        assignedDoctor: '', // ID of the doctor
        contactNumber: '',
        address: '',
        emergencyContactName: '',
        emergencyContactNumber: ''
    });

    const [loading, setLoading] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [error, setError] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            fetchPatientDetails();
        }

        // Fetch doctors for assignment (only for admins/non-doctors)
        if (userRole === 'admin' || userRole === 'superuser') {
            fetchDoctors();
        }
    }, [id, userRole]);

    const [rawCount, setRawCount] = useState(null);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const envBase = import.meta.env.VITE_API_BASE_URL || '';
            const url = `${envBase}/admin_page/users/`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const userData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setRawCount(userData.length);

            // Lenient filter for role_type or role
            const doctorList = userData.filter(u => {
                const role = (u.role_type || u.role || '').toLowerCase();
                return role === 'doctor';
            });

            setDoctors(doctorList);
        } catch (err) {
            console.error('Failed to fetch doctors:', err.response?.status, err.response?.data || err.message);
            if (err.response?.status === 403) {
                setError('PERMISSION ERROR (403): Coordinator cannot view user list.');
            } else {
                setError(`FETCH ERROR (${err.response?.status || 'network'}): ${err.message}`);
            }
        }
    };

    const fetchPatientDetails = async () => {
        try {
            setLoading(true);
            const data = await patientService.getPatientById(id);
            // Format dates for input fields
            const formattedData = {
                ...data,
                dateOfBirth: data.dateOfBirth?.split('T')[0] || '',
                admissionDate: data.admissionDate?.split('T')[0] || '',
                lastVisit: data.lastVisit?.split('T')[0] || '',
                assignedDoctor: data.assignedDoctor?.id || ''
            };
            setFormData(formattedData);
        } catch (err) {
            setError('Failed to fetch patient details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Prepare data for backend mapping
        const { assignedDoctor, ...rest } = formData;
        const submitData = {
            ...rest,
            assigned_doctor_id: assignedDoctor || null
        };

        try {
            if (isEditMode) {
                await patientService.updatePatient(id, submitData);
            } else {
                await patientService.addPatient(submitData);
            }
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/patients');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save patient');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-patient-container">
            {/* Header */}
            <div className="page-header">
                {/* Breadcrumbs */}
                <div className="breadcrumb">
                    <span className="breadcrumb-item link" onClick={() => navigate('/dashboard')}>Home</span>
                    <ChevronRight size={14} className="breadcrumb-separator" />
                    <span className="breadcrumb-item link" onClick={() => navigate('/patients')}>Patients</span>
                    <ChevronRight size={14} className="breadcrumb-separator" />
                    <span className="breadcrumb-item active">{isEditMode ? 'Edit Patient' : 'Add New Patient'}</span>
                </div>
                <h1 className="page-title">{isEditMode ? 'Edit Patient Details' : 'Add New Patient'}</h1>
                <p className="page-subtitle">Enter clinical and demographic information for admission.</p>
            </div>

            <form onSubmit={handleSubmit} className="patient-form-card">
                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">
                            <User size={18} />
                        </div>
                        <h2 className="section-title">Patient Demographics</h2>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">First Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. John"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Last Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date of Birth <span className="required">*</span></label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Gender <span className="required">*</span></label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">Select gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="section-divider"></div>

                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">
                            <Search size={18} />
                        </div>
                        <h2 className="section-title">Contact & Emergency Information</h2>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="text"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. +1 234 567 8900"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Emergency Contact Name</label>
                            <input
                                type="text"
                                name="emergencyContactName"
                                value={formData.emergencyContactName}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Jane Doe"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Emergency Phone</label>
                            <input
                                type="text"
                                name="emergencyContactNumber"
                                value={formData.emergencyContactNumber}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. +1 234 567 8901"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label className="form-label">Residential Address</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="Enter full residential address..."
                                rows="2"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="section-divider"></div>

                <div className="form-section">
                    <div className="section-header">
                        <div className="section-icon">
                            <Building2 size={18} />
                        </div>
                        <h2 className="section-title">Admission Details</h2>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Admission Date <span className="required">*</span></label>
                            <input
                                type="date"
                                name="admissionDate"
                                value={formData.admissionDate}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Ward / Department <span className="required">*</span></label>
                            <select
                                name="ward"
                                value={formData.ward}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">Select ward</option>
                                <option value="General Surgery">General Surgery</option>
                                <option value="ICU">ICU</option>
                                <option value="Burn Unit">Burn Unit</option>
                                <option value="Pediatrics">Pediatrics</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Room / Bed #</label>
                            <input
                                type="text"
                                name="roomNumber"
                                value={formData.roomNumber}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. 204-B"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Assigning Physician</label>
                            <div className="input-with-icon">
                                <input
                                    type="text"
                                    name="assigningPhysician"
                                    value={formData.assigningPhysician}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Search physician..."
                                />
                                <Search className="input-icon-right" size={16} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Discharged">Discharged</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Last Visit</label>
                            <input
                                type="date"
                                name="lastVisit"
                                value={formData.lastVisit}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>



                        <div className="form-group full-width">
                            <label className="form-label">Primary Diagnosis / Clinical Context</label>
                            <textarea
                                name="primaryDiagnosis"
                                value={formData.primaryDiagnosis}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="Enter initial diagnosis or reason for wound care referral..."
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="form-footer">
                    {error && <div className="error-text">{error}</div>}
                    <button type="button" onClick={() => navigate('/patients')} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Patient'}
                    </button>
                </div>
            </form>

            {/* Success Popup */}
            {showSuccess && (
                <div className="success-popup-overlay">
                    <div className="success-popup">
                        <div className="success-icon-circle">
                            <ChevronRight size={32} color="white" />
                        </div>
                        <h3>Success!</h3>
                        <p>Patient information has been {isEditMode ? 'updated' : 'registered'} successfully.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddPatient;
