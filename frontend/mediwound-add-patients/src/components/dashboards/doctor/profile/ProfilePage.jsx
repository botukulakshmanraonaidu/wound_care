import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Mail, Briefcase, Award,
  FileText, Save, CheckCircle, AlertCircle, Shield, Clock
} from 'lucide-react';
import { getProfile, updateProfile } from '../../../../API/authApi';
import './ProfilePage.css';

function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    specialization: '',
    bio: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingPicture, setExistingPicture] = useState(null);
  const [email, setEmail] = useState('');
  const [joinedDate, setJoinedDate] = useState('');
  const [lastLogin, setLastLogin] = useState('');

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const {
          full_name, role, job_title, specialization, bio,
          profile_picture, email: userEmail, date_joined, last_login
        } = res.data;

        setFormData({
          full_name: full_name || '',
          role: job_title || role || '',
          specialization: specialization || '',
          bio: bio || '',
        });

        setEmail(userEmail || localStorage.getItem('email') || '');
        setJoinedDate(date_joined || '');
        setLastLogin(last_login || '');

        if (profile_picture) {
          setExistingPicture(profile_picture);
          localStorage.setItem('profilePicture', profile_picture);
        } else {
          setExistingPicture(localStorage.getItem('profilePicture'));
        }
      } catch (err) {
        console.error('ProfilePage: Failed to fetch profile', err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleSave = async () => {
    setMessage('');
    setError('');
    setSaving(true);

    try {
      let updateData;

      if (selectedFile) {
        updateData = new FormData();
        updateData.append('full_name', formData.full_name);
        updateData.append('bio', formData.bio);
        updateData.append('profile_picture', selectedFile);
      } else {
        updateData = {
          full_name: formData.full_name,
          bio: formData.bio,
        };
      }

      const response = await updateProfile(updateData);
      setMessage('Profile updated successfully!');

      localStorage.setItem('userName', formData.full_name);

      if (response.data?.data?.profile_picture) {
        const picUrl = response.data.data.profile_picture;
        setExistingPicture(picUrl);
        localStorage.setItem('profilePicture', picUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
      }

      window.dispatchEvent(new Event('storage'));

      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError('Failed to save changes. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayPic = previewUrl || existingPicture;

  if (loading) {
    return (
      <div className="profile-page-loading">
        <div className="profile-page-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Hero Header */}
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-hero-content">
          <button
            className="profile-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-ring">
              {displayPic ? (
                <img src={displayPic} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-initials">
                  {getInitials(formData.full_name)}
                </div>
              )}
            </div>
            <button
              className="profile-avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload photo"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{formData.full_name || 'Your Name'}</h1>
            <div className="profile-hero-badges">
              {formData.role && (
                <span className="profile-badge profile-badge-role">
                  <Briefcase size={12} />
                  {formData.role}
                </span>
              )}
              {formData.specialization && (
                <span className="profile-badge profile-badge-spec">
                  <Award size={12} />
                  {formData.specialization}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-page-body">

        {/* Alerts */}
        {message && (
          <div className="profile-alert profile-alert-success">
            <CheckCircle size={16} />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="profile-alert profile-alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="profile-grid">

          {/* Left Column — Edit Form */}
          <div className="profile-col-main">
            <div className="profile-card">
              <div className="profile-card-header">
                <User size={18} />
                <h2>Personal Information</h2>
              </div>

              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="profile-input"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="email_display">Email Address</label>
                  <div className="profile-input-icon-wrap">
                    <Mail size={15} className="profile-input-icon" />
                    <input
                      id="email_display"
                      type="email"
                      value={email}
                      className="profile-input profile-input-icon-pad"
                      disabled
                      readOnly
                    />
                  </div>
                  <span className="profile-field-hint">Contact your administrator to change your email.</span>
                </div>

                <div className="profile-form-group">
                  <label htmlFor="role">Role / Title</label>
                  <input
                    id="role"
                    type="text"
                    value={formData.role}
                    className="profile-input profile-input-disabled"
                    disabled
                    readOnly
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="specialization">Specialization</label>
                  <input
                    id="specialization"
                    type="text"
                    value={formData.specialization || 'Not specified'}
                    className="profile-input profile-input-disabled"
                    disabled
                    readOnly
                  />
                </div>

                <div className="profile-form-group profile-form-full">
                  <label htmlFor="bio">
                    <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="profile-textarea"
                    placeholder="Write a short professional bio…"
                    rows={4}
                  />
                </div>
              </div>

              <div className="profile-card-footer">
                <button
                  className="profile-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="profile-btn-spinner" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column — Stats & Photo */}
          <div className="profile-col-side">

            {/* Photo Upload Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <Camera size={18} />
                <h2>Profile Photo</h2>
              </div>
              <div className="profile-photo-section">
                <div
                  className="profile-photo-preview"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Click to change photo"
                >
                  {displayPic ? (
                    <img src={displayPic} alt="Profile preview" className="profile-photo-img" />
                  ) : (
                    <div className="profile-photo-placeholder">
                      <User size={40} />
                    </div>
                  )}
                  <div className="profile-photo-overlay">
                    <Camera size={22} />
                    <span>Change Photo</span>
                  </div>
                </div>
                <p className="profile-photo-hint">JPG, PNG or GIF · Max 2 MB</p>
              </div>
            </div>

            {/* Account Stats Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <Shield size={18} />
                <h2>Account Details</h2>
              </div>
              <div className="profile-stats-list">
                <div className="profile-stat-item">
                  <div className="profile-stat-icon profile-stat-icon-teal">
                    <Clock size={15} />
                  </div>
                  <div className="profile-stat-info">
                    <span className="profile-stat-label">Member Since</span>
                    <span className="profile-stat-value">{formatDate(joinedDate)}</span>
                  </div>
                </div>
                <div className="profile-stat-item">
                  <div className="profile-stat-icon profile-stat-icon-indigo">
                    <Shield size={15} />
                  </div>
                  <div className="profile-stat-info">
                    <span className="profile-stat-label">Last Login</span>
                    <span className="profile-stat-value">{formatDate(lastLogin)}</span>
                  </div>
                </div>
                <div className="profile-stat-item">
                  <div className="profile-stat-icon profile-stat-icon-violet">
                    <Briefcase size={15} />
                  </div>
                  <div className="profile-stat-info">
                    <span className="profile-stat-label">Role</span>
                    <span className="profile-stat-value">{formData.role || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-security-link">
                <button
                  className="profile-btn-outline"
                  onClick={() => navigate('/settings')}
                >
                  <Shield size={14} />
                  Security &amp; Settings
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
