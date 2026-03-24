import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Shield, Filter, MoreVertical, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import './RoleManagement.css';
import { adminApi } from '../../../API/adminApi';

const RoleManagement = ({ accessLevel }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [phoneExistsError, setPhoneExistsError] = useState(null);
    const [checkingPhone, setCheckingPhone] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        role_type: 'nurse',
        job_title: '',
        department: '',
        password: '',
        confirm_password: '',
        specialization: '',
        license_id: '',
        ward: '',
        shift: '',
        access_level: '',
        phone_number: '',
        country_code: '+91'
    });

    // Check if user is superuser
    const isSuperuser = localStorage.getItem('isSuperuser') === 'true';

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.getUsers();
            // Handle both direct array and paginated response
            const data = Array.isArray(response.data) ? response.data : 
                         (response.data && response.data.results) ? response.data.results : [];
            setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setError(error.response?.data?.detail || error.response?.data?.message || 'Failed to load users');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Real-time phone validation
    useEffect(() => {
        const checkPhone = async () => {
            const phone = formData.phone_number;
            const digitsOnly = (phone || '').replace(/\D/g, '');
            
            if (digitsOnly.length >= 1) {
                setCheckingPhone(true);
                try {
                    const response = await adminApi.checkPhoneUnique(phone, editingUser?.id);
                    if (response.data.exists) {
                        setPhoneExistsError('This phone number is already in use');
                    } else {
                        setPhoneExistsError(null);
                    }
                } catch (err) {
                    console.error('Error checking phone uniqueness:', err);
                } finally {
                    setCheckingPhone(false);
                }
            } else {
                setPhoneExistsError(null);
            }
        };

        const timeoutId = setTimeout(() => {
            checkPhone();
        }, 300); // Reduced debounce to 300ms

        return () => clearTimeout(timeoutId);
    }, [formData.phone_number, editingUser]);


    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.department || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role_type === filterRole;
        return matchesSearch && matchesRole;
    });

    const handleAddUser = () => {
        setEditingUser(null);
        setFormData({
            full_name: '',
            email: '',
            role_type: 'nurse',
            job_title: '',
            department: '',
            password: '',
            confirm_password: '',
            specialization: '',
            license_id: '',
            ward: '',
            shift: '',
            access_level: '',
            phone_number: '',
            country_code: '+91'
        });
        setError(null);
        setShowAddUserModal(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name,
            email: user.email,
            role_type: user.role_type,
            job_title: user.job_title,
            department: user.department,
            specialization: user.specialization || '',
            license_id: user.license_id || '',
            ward: user.ward || '',
            shift: user.shift || '',
            access_level: user.access_level || '',
            phone_number: user.phone_number || '',
            country_code: user.country_code || '+91',
            password: '',
            confirm_password: ''
        });
        setError(null);
        setShowAddUserModal(true);
    };

    const handleDeleteUser = async (userId) => {
        try {
            await adminApi.deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
            setShowDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (checkingPhone) {
            setError("Please wait, validating phone number...");
            return;
        }

        if (phoneExistsError) {
            setError(phoneExistsError);
            return;
        }
        
        // Password validation
        if (formData.password && formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        const phone_digits = (formData.phone_number || '').replace(/\D/g, '');
        if (phone_digits && phone_digits.length > 10) {
            setError('Phone number must not exceed 10 digits');
            return;
        }

        // Final phone validation check before confirming
        setCheckingPhone(true);
        try {
            const response = await adminApi.checkPhoneUnique(formData.phone_number, editingUser?.id);
            if (response.data.exists) {
                setPhoneExistsError('This phone number is already in use');
                setError('This phone number is already in use');
                setCheckingPhone(false);
                return;
            }
        } catch (err) {
            console.error('Final phone check failed:', err);
        } finally {
            setCheckingPhone(false);
        }

        // Show confirmation before proceeding
        setShowSubmitConfirm(true);
    };

    const confirmSubmit = async () => {
        setShowSubmitConfirm(false);
        setIsSubmitting(true);
        setError(null);

        try {
            if (editingUser) {
                // Remove password fields if empty for update
                const updateData = { ...formData };
                if (!updateData.password) {
                    delete updateData.password;
                    delete updateData.confirm_password;
                }
                await adminApi.updateUser(editingUser.id, updateData);
            } else {
                await adminApi.createUser(formData);
            }

            await fetchUsers();
            setShowAddUserModal(false);
        } catch (err) {
            console.error('Error saving user:', err);
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'object') {
                    // Extract first error message from the object
                    const firstError = Object.values(data).flat()[0];
                    setError(firstError || 'Data validation failed');
                } else {
                    setError(data.toString());
                }
            } else {
                setError('Failed to save user');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleBadgeClass = (roleType) => {
        switch (roleType) {
            case 'doctor': return 'role-doctor';
            case 'nurse': return 'role-nurse';
            case 'admin': return 'role-admin';
            default: return 'role-default';
        }
    };

    return (
        <div className="role-management-container">
            {/* Header */}
            <div className="role-header">
                <div className="header-content">
                    <div className="header-icon">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="role-title">Role Management</h1>
                        <p className="role-subtitle">Manage access levels for clinical staff</p>
                    </div>
                </div>
                <button className="btn-add-user" onClick={handleAddUser}>
                    <Plus size={20} />
                    <span>Add User</span>
                </button>
            </div>

            {error && (
                <div className="error-banner" style={{
                    color: '#991b1b',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    marginRight: '10px',
                    marginLeft: '10px',
                    background: '#fef2f2',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Filters and Search */}
            <div className="role-toolbar">
                <div className="search-box">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="role-filter"
                    >
                        <option value="all">All Roles</option>
                        <option value="doctor">Doctors</option>
                        <option value="nurse">Nurses</option>
                        <option value="admin">Administrators</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="users-table-card">
                {loading && users.length === 0 ? (
                    <div className="loading-state" style={{ padding: '40px', textAlign: 'center' }}>Loading users...</div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>NAME</th>
                                <th>ROLE</th>
                                <th>DEPARTMENT</th>
                                <th>STAFF ID</th>
                                <th className="text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="no-results">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-info">
                                                <div className="user-avatar">
                                                    {(user.full_name || 'U').split(' ').map(n => n?.[0]).join('')}
                                                </div>
                                                <div className="user-details" style={{ overflow: 'hidden' }}>
                                                    <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
                                                    <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${getRoleBadgeClass(user.role_type)}`}>
                                                {user.role_type ? user.role_type.charAt(0).toUpperCase() + user.role_type.slice(1) : 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="department-cell">{user.department}</td>
                                        <td className="last-active-cell">#{user.id}</td>
                                        <td className="text-right">
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn edit-btn"
                                                    onClick={() => handleEditUser(user)}
                                                    title="Edit user"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {(accessLevel === 'Full' || isSuperuser) && (
                                                    <button
                                                        className="action-btn delete-btn"
                                                        onClick={() => setShowDeleteConfirm(user.id)}
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}

                {/* Stats Footer */}
                <div className="table-footer">
                    <span className="user-count">
                        Showing {filteredUsers.length} of {users.length} users
                    </span>
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {showAddUserModal && (
                <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowAddUserModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="user-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="e.g. Dr. John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email Address *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="user@hospital.com"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select
                                            className="form-select"
                                            style={{ width: '100px' }}
                                            value={formData.country_code}
                                            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                        >
                                            <option value="+91">+91 (IN)</option>
                                            <option value="+1">+1 (US)</option>
                                            <option value="+44">+44 (UK)</option>
                                            <option value="+971">+971 (UAE)</option>
                                            <option value="+61">+61 (AU)</option>
                                        </select>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            placeholder="10 digits"
                                            style={{ flex: 1, borderColor: phoneExistsError ? '#ef4444' : undefined }}
                                        />
                                    </div>
                                    <div style={{ minHeight: '20px', marginTop: '4px' }}>
                                        {checkingPhone ? (
                                            <span className="text-muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div className="spinner-border spinner-border-sm" role="status" style={{ width: '12px', height: '12px' }}></div>
                                                Checking availability...
                                            </span>
                                        ) : phoneExistsError ? (
                                            <span style={{ color: '#ef4444', fontSize: '12px', display: 'block' }}>{phoneExistsError}</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Role Type *</label>
                                    <select
                                        className="form-select"
                                        value={formData.role_type}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                role_type: e.target.value,
                                                specialization: '',
                                                license_id: '',
                                                ward: '',
                                                shift: '',
                                                access_level: ''
                                            })
                                        }
                                        required
                                    >
                                        <option value="">Select Role</option>
                                        <option value="doctor">Doctor</option>
                                        <option value="nurse">Nurse</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Job Title *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.job_title}
                                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                        placeholder="e.g. Lead Physician"
                                        required
                                    />
                                </div>
                            </div>

                            {/* ===== Doctor Specific Fields ===== */}
                            {formData.role_type === 'doctor' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Specialization *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.specialization}
                                            onChange={(e) =>
                                                setFormData({ ...formData, specialization: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">License ID *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.license_id}
                                            onChange={(e) =>
                                                setFormData({ ...formData, license_id: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ===== Nurse Specific Fields ===== */}
                            {formData.role_type === 'nurse' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Ward *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.ward}
                                            onChange={(e) =>
                                                setFormData({ ...formData, ward: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Shift *</label>
                                        <select
                                            className="form-select"
                                            value={formData.shift}
                                            onChange={(e) =>
                                                setFormData({ ...formData, shift: e.target.value })
                                            }
                                            required
                                        >
                                            <option value="">Select Shift</option>
                                            <option value="Day">Day</option>
                                            <option value="Night">Night</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* ===== Admin Specific Fields ===== */}
                            {formData.role_type === 'admin' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Access Level *</label>
                                        <select
                                            className="form-select"
                                            value={formData.access_level}
                                            onChange={(e) =>
                                                setFormData({ ...formData, access_level: e.target.value })
                                            }
                                            required
                                        >
                                            <option value="">Select Access</option>
                                            <option value="Full">Full</option>
                                            <option value="Limited">Limited</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* ===== Coordinator Specific Fields - No extra fields needed ===== */}


                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Department *</label>
                                    <select
                                        className="form-select"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        required
                                    >
                                        <option value="">Select department</option>
                                        <option value="Wound Care Unit">Wound Care Unit</option>
                                        <option value="Emergency">Emergency</option>
                                        <option value="ICU">ICU</option>
                                        <option value="General Surgery">General Surgery</option>
                                        <option value="Clinical Trials">Clinical Trials</option>
                                        <option value="IT Security">IT Security</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{editingUser ? 'New Password (optional)' : 'Initial Password *'}</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-input"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value, confirm_password: e.target.value })} // Simplification for now
                                            placeholder="••••••••"
                                            required={!editingUser}
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {!editingUser || formData.password ? (
                                        <span className={`password-hint ${
                                            !formData.password 
                                                ? 'text-muted' 
                                                : formData.password.length >= 6 
                                                    ? 'text-success' 
                                                    : 'text-danger'
                                        }`}>
                                            Password must be at least 6 characters
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddUserModal(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    disabled={isSubmitting || checkingPhone || !!phoneExistsError}
                                    title={phoneExistsError ? "Fix duplicate phone number to enable" : ""}
                                >
                                    {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                                </button>
                            </div>

                            {/* Inner Form Confirmation Pop-up */}
                            {showSubmitConfirm && (
                                <div className="inner-modal-overlay">
                                    <div className="inner-modal-content">
                                        <div className="inner-modal-header">
                                            <AlertTriangle size={24} className="text-warning" />
                                            <h3>Confirm Action</h3>
                                        </div>
                                        <div className="inner-modal-body">
                                            <p>Are you sure you want to {editingUser ? 'update' : 'create'} this user?</p>
                                            <p className="subtext">
                                                {formData.password ? 'Password meets the 6-character requirement.' : 'Proceeding with current profile data.'}
                                            </p>
                                        </div>
                                        <div className="inner-modal-footer">
                                            <button 
                                                type="button" 
                                                className="btn-inner-cancel"
                                                onClick={() => setShowSubmitConfirm(false)}
                                            >
                                                Review Again
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn-inner-confirm"
                                                onClick={confirmSubmit}
                                                disabled={checkingPhone || !!phoneExistsError}
                                            >
                                                Confirm & {editingUser ? 'Update' : 'Create'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                        <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Confirm Delete</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowDeleteConfirm(null)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete this user?</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteConfirm(null)}
                                >
                                    No
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteUser(showDeleteConfirm)}
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default RoleManagement;
