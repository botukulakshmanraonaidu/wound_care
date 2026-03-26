import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CircleAlert, Activity, Clock, Calendar, ArrowUp, ArrowDown, Plus, User } from 'lucide-react';
import { patientService } from '../../../services/patientService';
import AuthAPI from '../../../API/authApi';
import { API_BASE_URL } from './patients/config';
import './Dashboard.css';

function Dashboard({ user, setActiveTab, setSelectedPatient }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activePatients: 0,
        criticalCases: 0,
        healingRate: 0,
        avgTime: '4.2m'
    });
    const [priorityPatients, setPriorityPatients] = useState([]);
    const [recentVisits, setRecentVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        const fetchDashboardData = async (isPoll = false) => {
            if (!isPoll) setLoading(true);
            else setRefreshing(true);

            try {
                const patients = await patientService.getPatients('all');
                const assessmentsRes = await AuthAPI.get('api/assessments/');
                const allAssessments = assessmentsRes.data || [];
                const patientsRes = await AuthAPI.get('api/patients/?filter=doctor_new_patients&limit=5');
                const newPatients = (patientsRes.data?.results || patientsRes.data || []);

                const patientLatestAssessment = {};
                const patientAssessments = {};

                allAssessments.forEach(a => {
                    const pid = a.patient;
                    if (!patientAssessments[pid]) patientAssessments[pid] = [];
                    patientAssessments[pid].push(a);

                    if (!patientLatestAssessment[pid] || new Date(a.created_at) > new Date(patientLatestAssessment[pid].created_at)) {
                        patientLatestAssessment[pid] = a;
                    }
                });

                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

                const critical = patients.filter(p => {
                    const status = p.status?.toLowerCase();
                    const isStaticCritical = status === 'critical' || status === 'high risk' || status === 'emergency' || status === 'icu';
                    const latest = patientLatestAssessment[p.id];
                    const isAssessmentCritical = latest && (
                        latest.wound_stage === 'Stage III' ||
                        latest.wound_stage === 'Stage IV' ||
                        (latest.healing_index !== null && parseFloat(latest.healing_index) < 50)
                    );
                    const isICUWard = p.ward && p.ward.toLowerCase().includes('icu');
                    const qualifies = isICUWard && (isStaticCritical || isAssessmentCritical);

                    if (!qualifies) return false;
                    const pUpdated = new Date(p.updated_at);
                    const aUpdated = latest ? new Date(latest.updated_at || latest.created_at) : new Date(0);
                    const lastUpdatedVal = pUpdated > aUpdated ? pUpdated : aUpdated;
                    p._lastUpdatedForPriority = lastUpdatedVal;
                    return lastUpdatedVal >= twentyFourHoursAgo;
                });

                let improvingCount = 0;
                let totalAssessed = 0;
                const distribution = {};
                allAssessments.forEach(a => {
                    const type = a.wound_type || 'Other';
                    distribution[type] = (distribution[type] || 0) + 1;
                });

                Object.keys(patientAssessments).forEach(pid => {
                    const assessments = patientAssessments[pid].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    if (assessments.length > 0) {
                        totalAssessed++;
                        const latest = assessments[0];
                        const hIndex = parseFloat(latest.healing_index || 0);
                        const redRate = parseFloat(latest.reduction_rate || 0);
                        if (hIndex >= 50 || redRate > 0) improvingCount++;
                    }
                });

                const healingRate = totalAssessed > 0 ? Math.round((improvingCount / totalAssessed) * 100) : 0;
                const totalWounds = allAssessments.length;
                const formattedDist = Object.entries(distribution)
                    .map(([name, count]) => ({
                        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        percentage: totalWounds > 0 ? Math.round((count / totalWounds) * 100) : 0,
                        color: name.includes('Pressure') ? 'blue' : name.includes('Diabetic') ? 'green' : 'orange'
                    }))
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 3);

                const trulyActivePatients = patients.filter(p => p.status !== 'Discharged');
                const baseTime = 4.5;
                const improvementPerAssessment = 0.05;
                const calculatedAvg = Math.max(2.8, baseTime - (allAssessments.length * improvementPerAssessment)).toFixed(1);

                const result = {
                    stats: {
                        activePatients: trulyActivePatients.length,
                        criticalCases: critical.length,
                        healingRate: healingRate,
                        avgTime: `${calculatedAvg}m`,
                        distribution: formattedDist
                    },
                    priorityPatients: critical.slice(0, 3),
                    recentVisits: newPatients
                };

                setPriorityPatients(result.priorityPatients);
                setRecentVisits(result.recentVisits);
                setStats(result.stats);
                setLastUpdated(new Date());

            } catch (error) {
                console.error("Dashboard data fetch failed", error);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        };

        fetchDashboardData();
        const pollInterval = setInterval(() => fetchDashboardData(true), 30000);
        return () => clearInterval(pollInterval);
    }, [user]);

    const handlePatientClick = (patient) => {
        setSelectedPatient(patient);
        setActiveTab('patients');
    };

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

    return (
        <div className="dashboard-container">
            {/* Admin-Style Header */}
            <div className="admin-header-content">
                <div className="admin-title-section">
                    <div className="breadcrumbs">
                        Home <span>&gt;</span> Doctor Dashboard
                    </div>
                    <div className="admin-title">
                        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                            <h1>Clinical Oversight</h1>
                            <div className={`live-indicator ${refreshing ? 'syncing' : ''}`}>
                                <span className="dot"></span>
                                <span className="label">Live Sync Active</span>
                            </div>
                        </div>
                        <p className="admin-subtitle">
                            Good Morning, {user?.full_name || 'Doctor'}. You have {stats.criticalCases} critical cases.
                            <span style={{ marginLeft: '12px', fontSize: '11px', color: '#94A3B8' }}>
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="btn btn-primary btn-add-patient"
                        onClick={() => navigate('/patients/add')}
                    >
                        <Plus size={18} />
                        <span>New Patient</span>
                    </button>

                    <div className="admin-avatar-container hidden sm:block">
                        {user?.profile_picture ? (
                            <img src={user.profile_picture} alt="Doctor Profile" className="admin-avatar-img" />
                        ) : (
                            <div className="admin-avatar-placeholder">
                                <User size={26} color="#64748b" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card clickable" onClick={() => setActiveTab('patients')}>
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-blue">
                            <Users size={18} />
                        </div>
                        <div className="stat-trend trend-up">
                            <ArrowUp size={12} />
                            <span>+12%</span>
                        </div>
                    </div>
                    <div className="stat-value">{stats.activePatients}</div>
                    <div className="stat-label">Total Inpatients</div>
                    <div className="stat-subtext">Currently admitted for wound care</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-red">
                            <CircleAlert size={18} />
                        </div>
                        <div className="stat-trend trend-down">
                            <ArrowDown size={12} />
                            <span>-2</span>
                        </div>
                    </div>
                    <div className="stat-value">{stats.criticalCases}</div>
                    <div className="stat-label">Priority Alerts</div>
                    <div className="stat-subtext">Requires immediate clinical review</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-green">
                            <Activity size={18} />
                        </div>
                        <div className="stat-trend trend-up">
                            <ArrowUp size={12} />
                            <span>+5%</span>
                        </div>
                    </div>
                    <div className="stat-value">{stats.healingRate}%</div>
                    <div className="stat-label">Healing Velocity</div>
                    <div className="stat-subtext">Aggregated wound reduction rate</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-purple">
                            <Clock size={18} />
                        </div>
                        <div className="stat-trend trend-up">
                            <ArrowUp size={12} />
                            <span>-30s</span>
                        </div>
                    </div>
                    <div className="stat-value">{stats.avgTime}</div>
                    <div className="stat-label">Efficiency Index</div>
                    <div className="stat-subtext">AI-assisted documentation speed</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                <div className="dashboard-col-left">

                    <div className="content-card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Clinical Healing Index</h3>
                                <div className="card-subtitle">Aggregate scoring of wound recovery progress</div>
                            </div>
                        </div>
                        <div className="chart-container">
                            <svg viewBox="0 0 500 200" className="chart-svg">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {[0, 25, 50, 75, 100].map((label) => {
                                    const y = 180 - (label * 1.5);
                                    return (
                                        <g key={label}>
                                            <text x="5" y={y + 4} className="chart-y-label">{label}</text>
                                            <line x1="35" y1={y} x2="480" y2={y} stroke="#E2E8F0" strokeDasharray={label === 0 ? "0" : "4"} strokeWidth="1" />
                                        </g>
                                    );
                                })}
                                <path d="M35,160 C100,150 150,130 200,110 C250,90 300,70 350,50 C400,40 450,30 480,25 V180 H35 Z" fill="url(#chartGradient)" />
                                <path d="M35,160 C100,150 150,130 200,110 C250,90 300,70 350,50 C400,40 450,30 480,25" fill="none" stroke="#2563eb" strokeWidth="3" />
                            </svg>
                        </div>
                    </div>

                    <div className="content-card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">New Admissions Oversight</h3>
                                <div className="card-subtitle">Patients awaiting clinical nurse allocation</div>
                            </div>
                            <button
                                className="btn-link-blue"
                                style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => navigate('/patients')}
                            >
                                View All
                            </button>
                        </div>
                        <div className="admin-patients-list pt-2">
                            {recentVisits.length > 0 ? recentVisits.map((patient) => (
                                <div key={patient.id} className="patient-row-mini">
                                    <div className="p-info">
                                        <div className="p-name">{patient.first_name} {patient.last_name}</div>
                                        <div className="p-mrn">MRN: {patient.mrn}</div>
                                    </div>
                                    <div className="p-details hidden md:flex">
                                        <div className="p-ward">{patient.ward || 'General'}</div>
                                        <div className="p-status">{patient.status || 'Active'}</div>
                                    </div>
                                    <div className="p-actions">
                                        <div className="p-date">
                                            {new Date(patient.admission_date || patient.created_at).toLocaleDateString()}
                                        </div>
                                        <button
                                            className="btn-view-small"
                                            onClick={() => navigate(`/patients/${patient.id}`)}
                                        >
                                            Review
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">All patients have assigned nurses.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="dashboard-col-right">
                    <div className="content-card priority-card">
                        <div className="card-header">
                            <div className="card-title-wrapper">
                                <CircleAlert size={20} className="text-red" />
                                <h3 className="card-title text-red">Critical Case Review</h3>
                            </div>
                        </div>
                        {priorityPatients.length > 0 ? priorityPatients.map((patient, i) => {
                            const status = patient.status?.toLowerCase();
                            const badgeClass = status === 'emergency' ? 'badge-orange' :
                                status === 'icu' ? 'badge-purple' : 'badge-red';
                            const badgeText = status === 'emergency' ? 'EMERGENCY' :
                                status === 'icu' ? 'ICU' :
                                    status === 'high risk' ? 'HIGH RISK' : 'CRITICAL';

                            return (
                                <div key={i} className="priority-item clickable" onClick={() => handlePatientClick(patient)}>
                                    <div className="priority-header">
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className="priority-name">{patient.firstName} {patient.lastName}</span>
                                            {patient._lastUpdatedForPriority && (
                                                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    Updated: {new Intl.DateTimeFormat('en-US', {
                                                        month: 'short', day: 'numeric',
                                                        hour: 'numeric', minute: '2-digit'
                                                    }).format(patient._lastUpdatedForPriority)}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`badge ${badgeClass}`}>{badgeText}</span>
                                    </div>
                                    <p className="priority-desc">
                                        {status === 'emergency'
                                            ? 'Requires immediate emergency attention and intervention.'
                                            : status === 'icu'
                                                ? 'Intensive care patient requiring continuous monitoring.'
                                                : 'Needs immediate review of latest vitals and assessment data.'}
                                    </p>
                                </div>
                            );
                        }) : (
                            <div className="empty-state">All high-risk patients have been reviewed.</div>
                        )}
                    </div>

                    <div className="content-card">
                        <div className="card-header">
                            <h3 className="card-title">Morbidity Distribution</h3>
                        </div>
                        <div className="distribution-list">
                            {(stats.distribution && stats.distribution.length > 0) ? stats.distribution.map((item, i) => (
                                <div key={i} className="distribution-item">
                                    <div className="dist-header"><span>{item.name}</span><span className="font-bold">{item.percentage}%</span></div>
                                    <div className="progress-bar"><div className={`progress-fill fill-${item.color}`} style={{ width: `${item.percentage}%` }}></div></div>
                                </div>
                            )) : (
                                <>
                                    <div className="distribution-item">
                                        <div className="dist-header"><span>Pressure Ulcers</span><span className="font-bold">40%</span></div>
                                        <div className="progress-bar"><div className="progress-fill fill-blue" style={{ width: '40%' }}></div></div>
                                    </div>
                                    <div className="distribution-item">
                                        <div className="dist-header"><span>Diabetic Foot</span><span className="font-bold">35%</span></div>
                                        <div className="progress-bar"><div className="progress-fill fill-green" style={{ width: '35%' }}></div></div>
                                    </div>
                                    <div className="distribution-item">
                                        <div className="dist-header"><span>Other</span><span className="font-bold">25%</span></div>
                                        <div className="progress-bar"><div className="progress-fill fill-orange" style={{ width: '25%' }}></div></div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .clickable { cursor: pointer; transition: all 0.2s; }
                .clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .empty-state { padding: 20px; text-align: center; color: #94a3b8; font-style: italic; }
            `}</style>
        </div>
    );
}

export default Dashboard;
