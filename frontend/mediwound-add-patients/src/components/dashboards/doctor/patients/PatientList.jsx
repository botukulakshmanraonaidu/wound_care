import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, ChevronRight, Filter, Trash2, AlertTriangle, X } from 'lucide-react';
import { patientService } from '../../../../services/patientService';
import './PatientList.css';

const PatientList = () => {
    const navigate = useNavigate();
<<<<<<< HEAD
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const userRole = localStorage.getItem('userRole')?.toLowerCase();
    const [activeFilter, setActiveFilter] = useState(userRole === 'nurse' ? 'my' : 'all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [loadingReportId, setLoadingReportId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores patient id to delete

=======
>>>>>>> e0ff7c8 (new changes)
    // Auth context/role
    const userId = localStorage.getItem('userId');

    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState((userRole === 'nurse' || userRole === 'doctor') ? 'my' : 'all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [loadingReportId, setLoadingReportId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores patient id to delete


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

    const executeDelete = async () => {
        if (!showDeleteConfirm) return;
        
        try {
            await patientService.deletePatient(showDeleteConfirm);
            // Refresh the list natively keeping current filter setting active
            fetchPatients(activeFilter);
        } catch (error) {
            alert("Failed to delete patient. The server may have returned an error.");
            console.error("Deletion fell through: ", error);
        } finally {
            setShowDeleteConfirm(null);
        }
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
<<<<<<< HEAD
                                    
=======
>>>>>>> e0ff7c8 (new changes)
                                    {userRole !== 'nurse' && (
                                        <button
                                            className={`filter-menu-item ${activeFilter === 'all' ? 'selected' : ''}`}
                                            onClick={() => setActiveFilter('all')}
                                        >
                                            All Patients
                                        </button>
                                    )}
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
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px 0' }}>
                                        <div className="table-loader-container">
                                            <div className="spinner-small"></div>
                                            <span style={{ marginLeft: '12px', color: '#64748B', fontWeight: 500 }}>Updating Patient Directory...</span>
                                        </div>
                                    </td>
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
                                                {userRole === 'admin' && (
                                                    <button className="btn-icon-link" style={{ color: '#ef4444' }} onClick={() => setShowDeleteConfirm(patient.id)} title="Delete Patient">
                                                        <Trash2 size={18} />
                                                    </button>
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

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={20} color="#EF4444" />
                                <h2>Confirm Delete</h2>
                            </div>
                            <button
                                className="modal-close"
                                onClick={() => setShowDeleteConfirm(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this patient and all their records? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setShowDeleteConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-delete"
                                onClick={executeDelete}
                            >
                                <Trash2 size={16} />
                                Delete Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
