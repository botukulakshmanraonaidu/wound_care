import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Monitor, ChevronRight, Camera, Mail, Smartphone, Lock, Key, Moon, Sun, Type, Contrast } from 'lucide-react';
import { getProfile, updateProfile } from '../../../../API/authApi';
import './Settings.css';

function Settings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        role: '',
        specialization: '',
        bio: '',
        password: '',
        confirmPassword: ''
    });

    // Notification preferences state
    const [notifications, setNotifications] = useState({
        emailNewPatient: true,
        emailCriticalAlerts: true,
        emailWeeklySummary: false,
        pushClinicalNotes: true,
        pushAnalysisComplete: true,
    });

    // Display preferences state
    const [displayPrefs, setDisplayPrefs] = useState({
        theme: 'light',
        fontSize: 'medium',
        highContrast: false,
    });

    const [passwordUpdatedAt, setPasswordUpdatedAt] = useState(null);

    const menuItems = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'security', label: 'Security & Login', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'display', label: 'Display & Accessibility', icon: Monitor },
    ];

    // Fetch Profile Data on Mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getProfile();
                const { full_name, role, job_title, specialization, bio, password_updated_at } = res.data;
                setFormData(prev => ({
                    ...prev,
                    full_name: full_name || '',
                    role: job_title || role || '',
                    specialization: specialization || '',
                    bio: bio || ''
                }));
                setPasswordUpdatedAt(password_updated_at);
            } catch (err) {
                console.error("Failed to fetch profile", err);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleNotificationToggle = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setMessage('');
        setError('');
        setLoading(true);

        const { full_name, bio, password, confirmPassword } = formData;

        if (password && password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const updateData = { full_name, bio };
            if (password) updateData.password = password;

            const response = await updateProfile(updateData);
            setMessage("Profile updated successfully");

            localStorage.setItem("userName", full_name);
            window.dispatchEvent(new Event('storage'));

            if (password) {
                // Update local time immediately if password was changed
                setPasswordUpdatedAt(new Date().toISOString());
            }

            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err) {
            setError("Failed to update profile. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to format the relative time for password change
    const getPasswordRelativeTime = () => {
        if (!passwordUpdatedAt) return "Never updated";
        const lastDate = new Date(passwordUpdatedAt);
        const diffMs = new Date() - lastDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Changed today";
        if (diffDays === 1) return "Changed 1 day ago";
        return `Changed ${diffDays} days ago`;
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-subtitle">Manage your account preferences and application settings.</p>
            </div>

            <div className="settings-content">
                <div className="settings-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <div className="nav-item-left">
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </div>
                            {activeTab === item.id && <ChevronRight size={16} />}
                        </button>
                    ))}
                </div>

                <div className="settings-main">
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="profile-settings">
                            <div className="section-header">
                                <h2 className="section-title">Public Profile</h2>
                                <p className="section-subtitle">Manage your personal information and password.</p>
                            </div>

                            {message && <div className="success-message">{message}</div>}
                            {error && <div className="error-message">{error}</div>}

                            <div className="profile-form">
                                <div className="profile-avatar-section">
                                    <div className="avatar-placeholder">
                                        <Camera size={24} color="#64748b" />
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="full_name">Full Name</label>
                                        <input
                                            type="text"
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Enter full name"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="role">Role / Title (Read Only)</label>
                                        <input
                                            type="text"
                                            id="role"
                                            value={formData.role}
                                            className="form-input"
                                            disabled
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="specialization">Specialization (Read Only)</label>
                                        <input
                                            type="text"
                                            id="specialization"
                                            value={formData.specialization}
                                            className="form-input"
                                            disabled
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label htmlFor="bio">Bio</label>
                                        <textarea
                                            id="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            className="form-textarea"
                                            placeholder="Write a short bio..."
                                            rows={4}
                                        ></textarea>
                                    </div>

                                    <div className="form-group full-width">
                                        <h3 className="section-divider">Change Password</h3>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="password">New Password</label>
                                        <input
                                            type="password"
                                            id="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Leave blank to keep current"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="confirmPassword">Confirm Password</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button
                                        className="btn-save"
                                        onClick={handleSave}
                                        disabled={loading}
                                    >
                                        {loading ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="security-settings">
                            <div className="section-header">
                                <h2 className="section-title">Security & Login</h2>
                                <p className="section-subtitle">Manage your account security and authentication methods.</p>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Lock size={20} />
                                    <h3>PASSWORD</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Change password</p>
                                        <p className="setting-description">{getPasswordRelativeTime()}</p>
                                    </div>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setActiveTab('profile')}
                                    >
                                        Update
                                    </button>
                                </div>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Key size={20} />
                                    <h3>TWO-FACTOR AUTHENTICATION</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Authenticator app</p>
                                        <p className="setting-description">Use an authentication app to generate one-time codes</p>
                                    </div>
                                    <button className="btn-secondary">Enable</button>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">SMS authentication</p>
                                        <p className="setting-description">Receive codes via text message</p>
                                    </div>
                                    <button className="btn-secondary">Setup</button>
                                </div>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Shield size={20} />
                                    <h3>ACTIVE SESSIONS</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Current device</p>
                                        <p className="setting-description">Windows • Chrome • Last active now</p>
                                    </div>
                                    <span className="badge-active">Active</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="notifications-settings">
                            <div className="section-header">
                                <h2 className="section-title">Notification Preferences</h2>
                                <p className="section-subtitle">Choose how and when you want to be notified.</p>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Mail size={20} />
                                    <h3>EMAIL NOTIFICATIONS</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">New patient assigned to me</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notifications.emailNewPatient}
                                            onChange={() => handleNotificationToggle('emailNewPatient')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Critical wound deterioration alerts</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notifications.emailCriticalAlerts}
                                            onChange={() => handleNotificationToggle('emailCriticalAlerts')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Weekly department summaries</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notifications.emailWeeklySummary}
                                            onChange={() => handleNotificationToggle('emailWeeklySummary')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Smartphone size={20} />
                                    <h3>PUSH NOTIFICATIONS</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Mentioned in clinical notes</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notifications.pushClinicalNotes}
                                            onChange={() => handleNotificationToggle('pushClinicalNotes')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">AI analysis completed</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notifications.pushAnalysisComplete}
                                            onChange={() => handleNotificationToggle('pushAnalysisComplete')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DISPLAY TAB */}
                    {activeTab === 'display' && (
                        <div className="display-settings">
                            <div className="section-header">
                                <h2 className="section-title">Display & Accessibility</h2>
                                <p className="section-subtitle">Customize your viewing experience.</p>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Moon size={20} />
                                    <h3>THEME</h3>
                                </div>
                                <div className="theme-options">
                                    <button
                                        className={`theme-card ${displayPrefs.theme === 'light' ? 'active' : ''}`}
                                        onClick={() => setDisplayPrefs(prev => ({ ...prev, theme: 'light' }))}
                                    >
                                        <Sun size={24} />
                                        <span>Light</span>
                                    </button>
                                    <button
                                        className={`theme-card ${displayPrefs.theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => setDisplayPrefs(prev => ({ ...prev, theme: 'dark' }))}
                                    >
                                        <Moon size={24} />
                                        <span>Dark</span>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Type size={20} />
                                    <h3>TEXT SIZE</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">Font size</p>
                                    </div>
                                    <select
                                        className="form-select"
                                        value={displayPrefs.fontSize}
                                        onChange={(e) => setDisplayPrefs(prev => ({ ...prev, fontSize: e.target.value }))}
                                    >
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>
                            </div>

                            <div className="settings-section">
                                <div className="section-icon-header">
                                    <Contrast size={20} />
                                    <h3>ACCESSIBILITY</h3>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <p className="setting-label">High contrast mode</p>
                                        <p className="setting-description">Increase contrast for better visibility</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={displayPrefs.highContrast}
                                            onChange={() => setDisplayPrefs(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Settings;
