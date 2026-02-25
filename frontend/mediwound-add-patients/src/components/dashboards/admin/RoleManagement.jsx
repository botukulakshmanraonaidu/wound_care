import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Shield, Filter, MoreVertical, X, Eye, EyeOff } from 'lucide-react';
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

    // Check if user is superuser
    const isSuperuser = localStorage.getItem('isSuperuser') === 'true';

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await adminApi.getUsers();
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load users');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
        access_level: ''
    });

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
            access_level: ''
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
            setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save user');
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
                                <th>PASSWORD</th>
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
                                                <div className="user-details">
                                                    <div className="user-name">{user.full_name}</div>
                                                    <div className="user-email">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`role-badge ${getRoleBadgeClass(user.role_type)}`}>
                                                {user.job_title}
                                            </span>
                                        </td>
                                        <td className="department-cell">{user.department}</td>
                                        <td className="last-active-cell">#{user.id}</td>
                                        <td className="password-cell" style={{ fontFamily: 'monospace', color: '#6b7280' }}>
                                            {user.raw_password || '••••••••'}
                                        </td>
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
                        {error && <div className="error-message" style={{ color: 'red', padding: '10px', marginBottom: '10px', background: '#fee2e2', borderRadius: '4px' }}>{error}</div>}
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
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                                </button>
                            </div>
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
                                <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteConfirm(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteUser(showDeleteConfirm)}
                                >
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default RoleManagement;
