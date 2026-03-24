import React, { useState, useEffect } from 'react';
import {
    Users,
    Activity,
    AlertTriangle,
    Download,
    MoreHorizontal
} from 'lucide-react';
import '../doctor/Dashboard.css'; // Reuse base styles
import './AdminDashboard.css';    // Admin specific styles
import ChangeBoard from './ChangeBoard';
import { adminApi } from '../../../API/adminApi';
import AuthAPI from '../../../API/authApi';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total_users: '...',
        system_uptime: '...',
        security_alerts: '...',
        role_distribution: {}
    });
    const [storage, setStorage] = useState({
        used_percentage: 0,
        used_storage_bytes: 0,
        total_storage_bytes: 0,
        free_storage_bytes: 0,
        breakdown: []
    });
    const [recentAssessments, setRecentAssessments] = useState([]);
    const [recentPatients, setRecentPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statsLastUpdated, setStatsLastUpdated] = useState(new Date());

    const fetchAllStats = async (isPoll = false) => {
        try {
            if (!isPoll) setLoading(true);
            else setRefreshing(true);

            const [sysRes, storageRes, assessmentsRes, patientsRes] = await Promise.all([
                adminApi.getSystemStats(),
                adminApi.getStorageStats(),
                AuthAPI.get('api/assessments/?filter=recent_hour&limit=5'),
                AuthAPI.get('api/patients/?filter=recent_hour&limit=5')
            ]);

            setRecentAssessments(assessmentsRes.data || []);
            setRecentPatients(patientsRes.data || []);
            setStats(sysRes.data);
            setStorage(storageRes.data);
            setStatsLastUpdated(new Date());
            setLoading(false);
            setRefreshing(false);
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllStats();

        // Real-time updates interval: 30 seconds
        const pollInterval = setInterval(() => {
            fetchAllStats(true);
        }, 30000);

        return () => clearInterval(pollInterval);
    }, []);

    // Helper to format storage percentage for the chart circle
    const circumference = 2 * Math.PI * 70; // r=70
    const offset = circumference - (storage.used_percentage / 100) * circumference;
    const formattedPercent = Math.round(storage.used_percentage);

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return "0 GB";
        const gbs = bytes / (1024 * 1024 * 1024);
        if (gbs < 1) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
        return gbs.toFixed(2) + " GB";
    };

    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="admin-header-content">
                <div className="admin-title-section">
                    <div className="breadcrumbs">
                        Home <span>&gt;</span> System Administration
                    </div>
                    <div className="admin-title">
                        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                            <h1>System Administration</h1>
                            <div className={`live-indicator ${refreshing ? 'syncing' : ''}`}>
                                <span className="dot"></span>
                                <span className="label">Live Sync Active</span>
                            </div>
                        </div>
                        <p className="admin-subtitle">
                            Monitor system health and clinical data.
                            <span style={{ marginLeft: '12px', fontSize: '11px', color: '#94A3B8' }}>
                                Last updated: {statsLastUpdated.toLocaleTimeString()}
                            </span>
                        </p>
                    </div>
                </div>
                <button className="btn-export">
                    <Download size={18} />
                    <span className="hidden sm:inline">Export Report</span>
                </button>
            </div>

            {/* Stats Cards - Reusing .stat-card logic but with admin content */}
            <div className="admin-stats-grid">
                {/* Card 1: Active Users */}
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-blue">
                            <Users size={18} />
                        </div>
                        <div className="stat-trend trend-up">
                            <span>Registered</span>
                        </div>
                    </div>
                    <div className="stat-value">{stats.total_users}</div>
                    <div className="stat-label">System Users</div>
                    <div className="stat-subtext">Total active platform accounts</div>
                </div>

                {/* Card 2: System Uptime */}
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-green">
                            <Activity size={18} />
                        </div>
                        <div className="stat-trend trend-up">
                            Operational
                        </div>
                    </div>
                    <div className="stat-value">{stats.system_uptime}</div>
                    <div className="stat-label">System Uptime</div>
                    <div className="stat-subtext">Current service availability</div>
                </div>

                {/* Card 3: Security Alerts */}
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-red">
                            <AlertTriangle size={18} />
                        </div>
                        <div className="stat-trend trend-down">
                            Attention
                        </div>
                    </div>
                    <div className="stat-value">{stats.security_alerts}</div>
                    <div className="stat-label">System Alerts</div>
                    <div className="stat-subtext">Requires immediate review</div>
                </div>
            </div>

            {/* Main Content Grid: Logs & Storage */}
            <div className="dashboard-grid">
                {/* Left Column: Clinical Oversight */}
                <div className="dashboard-col-left">
                    <div className="content-card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <div className="card-title-wrapper">
                                <Users size={18} className="text-blue" style={{ marginRight: '8px' }} />
                                <div className="card-title">Admitted in Last Hour</div>
                            </div>
                            <a href="/patients" className="btn-link-blue" style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 600 }}>View Directory</a>
                        </div>
                        <div className="admin-patients-list">
                            {recentPatients.length > 0 ? recentPatients.map((patient) => (
                                <div key={patient.id} className="patient-row-mini">
                                    <div className="p-info">
                                        <div className="p-name">{patient.first_name} {patient.last_name}</div>
                                        <div className="p-mrn">MRN: {patient.mrn}</div>
                                    </div>
                                    <div className="p-details">
                                        <div className="p-ward">{patient.ward_department || patient.ward || 'General'}</div>
                                        <div className="p-status">{patient.status || 'Active'}</div>
                                    </div>
                                    <div className="p-actions">
                                        <div className="p-date">{new Date(patient.admission_date).toLocaleDateString()}</div>
                                        <button
                                            className="btn-view-small"
                                            onClick={() => navigate(`/patients/profile/${patient.id}`)}
                                        >
                                            Profile
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">No recent patients admitted.</div>
                            )}
                        </div>
                    </div>

                    <div className="content-card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <div className="card-title-wrapper">
                                <Activity size={18} className="text-blue" style={{ marginRight: '8px' }} />
                                <div className="card-title">Assessments in Last Hour</div>
                            </div>
                            <span className="badge badge-blue">System Wide</span>
                        </div>
                        <div className="admin-assessments-list">
                            {recentAssessments.length > 0 ? recentAssessments.map((assess) => (
                                <div key={assess.id} className="assessment-row-mini">
                                    <div className="assess-patient-info">
                                        <div className="assess-patient-name">{assess.patient_name || 'Unknown Patient'}</div>
                                        <div className="assess-patient-mrn">MRN: {assess.mrn || 'N/A'}</div>
                                    </div>
                                    <div className="assess-details-mini">
                                        <div className="assess-type">{assess.wound_type}</div>
                                        <div className="assess-stage">{assess.wound_stage}</div>
                                    </div>
                                    <div className="assess-meta-mini">
                                        <div className="assess-date">{new Date(assess.created_at).toLocaleDateString()}</div>
                                        <button
                                            className="btn-view-small"
                                            onClick={() => navigate('/reports', { state: { assessment: assess } })}
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">No recent assessments recorded.</div>
                            )}
                        </div>
                    </div>

                    <div className="content-card">
                        <div className="card-header">
                            <div className="card-title-wrapper">
                                <div className="card-title">System Activity Log</div>
                            </div>
                            <a href="/logs" className="btn-link-red" style={{ color: '#3B82F6' }}>View All</a>
                        </div>

                        <div className="admin-logs-scroll-container">
                            <ChangeBoard limit={5} showFilters={false} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Storage Status */}
                <div className="dashboard-col-right">
                    <div className="content-card">
                        <div className="card-header">
                            <div className="card-title-wrapper">
                                <div className="card-title">Storage Status</div>
                            </div>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <MoreHorizontal size={20} color="#64748B" />
                            </button>
                        </div>

                        <div className="storage-chart-wrapper">
                            <div className="donut-chart-container">
                                {/* Dynamic SVG Donut Chart */}
                                <svg width="160" height="160" viewBox="0 0 160 160">
                                    <circle cx="80" cy="80" r="70" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                                    <circle cx="80" cy="80" r="70" fill="none" stroke="#0F172A" strokeWidth="12"
                                        strokeDasharray={`${circumference - offset} ${circumference}`}
                                        strokeLinecap="round" transform="rotate(-90 80 80)"
                                        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                                </svg>
                                <div className="donut-center-text">
                                    <span className="percent">{formattedPercent}%</span>
                                    <span className="label">USED</span>
                                </div>
                            </div>
                        </div>

                        <div className="storage-legend">
                            {storage.breakdown.map((item, idx) => (
                                <div className="legend-item" key={idx}>
                                    <div className="legend-label">
                                        <span className="dot" style={{ background: item.color }}></span>
                                        {item.category}
                                    </div>
                                    <div className="legend-value">{item.label}</div>
                                </div>
                            ))}
                            <div className="legend-item">
                                <div className="legend-label">
                                    <span className="dot dot-gray"></span>
                                    Free Space
                                </div>
                                <div className="legend-value">{formatSize(storage.free_storage_bytes)}</div>
                            </div>
                        </div>

                        <button className="btn-manage">Manage Capacity</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
