import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, ChevronRight, Filter } from 'lucide-react';
import { patientService } from '../../../../services/patientService';
import './PatientList.css';

const PatientList = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [loadingReportId, setLoadingReportId] = useState(null);

    // Auth context/role
    const userRole = localStorage.getItem('userRole')?.toLowerCase();
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchPatients(activeFilter);
        setShowFilterDropdown(false);
    }, [activeFilter]);

    const fetchPatients = async (filter) => {
        try {
            setLoading(true);
            const data = await patientService.getPatients(filter);
            setPatients(data);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id) => {
        navigate(`/patients/profile/${id}`);
    };

    const handleEdit = (id) => {
        navigate(`/patients/edit/${id}`);
    };

    const filteredPatients = patients.filter(patient =>
        patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="patient-list-container">
            {/* Header */}
            <div className="page-header-flex">
                <div>
                    {/* Breadcrumbs */}
                    <div className="breadcrumb">
                        <span className="breadcrumb-item link" onClick={() => navigate('/dashboard')}>Home</span>
                        <ChevronRight size={14} className="breadcrumb-separator" />
                        <span className="breadcrumb-item active">Patients</span>
                    </div>
                    <h1 className="page-title">Patients Directory</h1>
                    <p className="page-subtitle">Manage patient admissions and current status.</p>
                </div>

                {/* Add Patient button for Doctors and Admins */}
                {['admin', 'doctor'].includes(userRole) && (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/patients/add')}
                    >
                        <Plus size={16} />
                        Add Patient
                    </button>
                )}
            </div>

            {/* Content Card */}
            <div className="content-card">
                {/* Toolbar */}
                <div className="table-toolbar">
                    <div className="search-box">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search patients by name or MRN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {/* Filter Icon Button & Dropdown */}
                        <div className="filter-container">
                            <button
                                className={`filter-btn ${showFilterDropdown ? 'active' : ''}`}
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                title="Filter Patients"
                            >
                                <Filter size={18} />
                            </button>

                            {showFilterDropdown && (
                                <div className="filter-menu">
                                    <div className="filter-menu-header">Show Patients</div>
                                    <button
                                        className={`filter-menu-item ${activeFilter === 'my' ? 'selected' : ''}`}
                                        onClick={() => setActiveFilter('my')}
                                    >
                                        My Patients
                                    </button>
                                    <button
                                        className={`filter-menu-item ${activeFilter === 'all' ? 'selected' : ''}`}
                                        onClick={() => setActiveFilter('all')}
                                    >
                                        All Patients
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Patient Name</th>
                                <th>MRN</th>
                                <th>Ward</th>
                                <th>Lead Physician</th>
                                <th>Status</th>
                                <th>Last Visit</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Loading patients...</td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>No patients found.</td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <tr key={patient.id}>
                                        <td>
                                            <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                                        </td>
                                        <td>{patient.mrn}</td>
                                        <td>
                                            <span className={`badge ${getBadgeClass(patient.ward)}`}>
                                                {patient.ward || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="font-medium text-slate-600">
                                            {patient.assignedDoctor?.full_name || patient.assignedDoctor?.email || 'None'}
                                        </td>
                                        <td>
                                            <span className={`status-text ${patient.status?.toLowerCase() || 'active'}`}>
                                                {patient.status || 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="last-visit-cell">
                                                {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No visits yet'}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="actions-group">
                                                {userRole === 'nurse' ? (
                                                    <button
                                                        className="btn-link"
                                                        disabled={loadingReportId === patient.id}
                                                        onClick={async () => {
                                                            setLoadingReportId(patient.id);
                                                            try {
                                                                await patientService.clearNotifications(patient.id);
                                                                const assessments = await patientService.getPatientAssessments(patient.id);

                                                                if (assessments && assessments.length > 0) {
                                                                    const latestAssessment = assessments[0];
                                                                    // Store in sessionStorage as a reliable fallback
                                                                    sessionStorage.setItem('nurse_report_assessment', JSON.stringify(latestAssessment));
                                                                    // Navigate with state
                                                                    navigate('/reports', { state: { assessment: latestAssessment } });
                                                                } else {
                                                                    alert('No assessment report found for this patient.');
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to load report:', err);
                                                                alert('Failed to load report. Please try again.');
                                                            } finally {
                                                                setLoadingReportId(null);
                                                            }
                                                        }}
                                                        style={{ color: '#2563eb', fontWeight: 600, opacity: loadingReportId === patient.id ? 0.7 : 1 }}
                                                    >
                                                        {loadingReportId === patient.id ? 'Loading...' : 'View Report'}
                                                    </button>
                                                ) : (
                                                    <>
                                                        {(userRole !== 'doctor' || String(patient.assignedDoctor?.id) === String(userId)) && (
                                                            <button className="btn-icon-link" onClick={() => handleView(patient.id)} title="View Profile">
                                                                <Eye size={18} />
                                                            </button>
                                                        )}
                                                        {['admin', 'doctor'].includes(userRole) && (
                                                            <button className="btn-link" onClick={() => handleEdit(patient.id)}>
                                                                Update
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Helper for badge styling
const getBadgeClass = (ward) => {
    switch (ward) {
        case 'Burn Unit': return 'badge-burn-unit';
        case 'ICU': return 'badge-icu';
        case 'General Surgery': return 'badge-general-ward';
        default: return 'badge-gray'; // generic fallback
    }
};

export default PatientList;
