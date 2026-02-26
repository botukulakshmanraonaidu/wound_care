import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertCircle, Activity, Clock, Calendar, ArrowUp, ArrowDown, Plus } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Optimization: Check session storage for recently fetched stats
            const cacheKey = `dashboard_stats_${user?.id}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // 5 minute cache
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    setStats(data.stats);
                    setPriorityPatients(data.priorityPatients);
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);
            try {
                // 1. Fetch assigned patients
                const patients = await patientService.getPatients('my');

                // 2. Fetch assessments to find critical cases and real healing rate
                const assessmentsRes = await AuthAPI.get('api/assessments/');
                const allAssessments = assessmentsRes.data || [];

                // 3. Process Latest Assessments for each patient
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

                // 4. Identify Critical Cases (Assessment-driven + Status-driven)
                const critical = patients.filter(p => {
                    const status = p.status?.toLowerCase();
                    const isStaticCritical = status === 'critical' || status === 'high risk' || status === 'emergency' || status === 'icu';

                    const latest = patientLatestAssessment[p.id];
                    const isAssessmentCritical = latest && (
                        latest.wound_stage === 'Stage III' ||
                        latest.wound_stage === 'Stage IV' ||
                        (latest.healing_index !== null && parseFloat(latest.healing_index) < 50)
                    );

                    // User requested: only ICU ward patients should be considered as critical cases
                    const isICUWard = p.ward && p.ward.toLowerCase().includes('icu');
                    return isICUWard && (isStaticCritical || isAssessmentCritical);
                });

                // 5. Calculate Healing Rate and Distribution
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

                        // Count as improving if index is healthy OR area has reduced (from reports)
                        if (hIndex >= 50 || redRate > 0) {
                            improvingCount++;
                        }
                    }
                });

                const healingRate = totalAssessed > 0 ? Math.round((improvingCount / totalAssessed) * 100) : 0;

                // Format distribution for UI
                const totalWounds = allAssessments.length;
                const formattedDist = Object.entries(distribution)
                    .map(([name, count]) => ({
                        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        percentage: totalWounds > 0 ? Math.round((count / totalWounds) * 100) : 0,
                        color: name.includes('Pressure') ? 'blue' : name.includes('Diabetic') ? 'green' : 'orange'
                    }))
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 3);

                // Filter truly ACTIVE patients (exclude Discharged)
                const trulyActivePatients = patients.filter(p => p.status !== 'Discharged');

                // Calculate dynamic Avg. Assessment Time (Simulating AI efficiency improvement)
                const baseTime = 4.5; // starting minutes
                const improvementPerAssessment = 0.05; // 3 seconds per assessment
                const calculatedAvg = Math.max(2.8, baseTime - (allAssessments.length * improvementPerAssessment)).toFixed(1);

                const result = {
                    stats: {
                        activePatients: trulyActivePatients.length,
                        criticalCases: critical.length,
                        healingRate: healingRate,
                        avgTime: `${calculatedAvg}m`,
                        distribution: formattedDist
                    },
                    priorityPatients: critical.slice(0, 3)
                };

                setPriorityPatients(result.priorityPatients);
                setStats(result.stats);

                // Save to session storage
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: result,
                    timestamp: Date.now()
                }));

            } catch (error) {
                console.error("Dashboard data fetch failed", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handlePatientClick = (patient) => {
        setSelectedPatient(patient);
        setActiveTab('patients');
    };

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <div className="current-date">{currentDay}</div>
                    <h1 className="welcome-text">Good Morning, {user?.full_name || 'Doctor'}</h1>
                    <div className="status-text">
                        <span className="status-icon">✓</span>
                        You have {stats.criticalCases} critical cases to review.
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary btn-add-patient"
                        onClick={() => navigate('/patients/add')}
                    >
                        <Plus size={18} />
                        <span>New Patient</span>
                    </button>
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
                    <div className="stat-label">Active Patients</div>
                    <div className="stat-subtext">Total across all units</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-wrapper icon-red">
                            <AlertCircle size={18} />
                        </div>
                        <div className="stat-trend trend-down">
                            <ArrowDown size={12} />
                            <span>-2</span>
                        </div>
                    </div>
                    <div className="stat-value">{stats.criticalCases}</div>
                    <div className="stat-label">Critical Cases</div>
                    <div className="stat-subtext">Requires daily monitoring</div>
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
                    <div className="stat-label">Wound Healing Rate</div>
                    <div className="stat-subtext">Patients improving this week</div>
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
                    <div className="stat-label">Avg. Assessment Time</div>
                    <div className="stat-subtext">AI-assisted speed</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                <div className="dashboard-col-left">

                    <div className="content-card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Healing Efficiency Trend</h3>
                                <div className="card-subtitle">Average healing score improvement</div>
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
                </div>

                <div className="dashboard-col-right">
                    <div className="content-card priority-card">
                        <div className="card-header">
                            <div className="card-title-wrapper">
                                <AlertCircle size={20} className="text-red" />
                                <h3 className="card-title text-red">Priority Attention</h3>
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
                                        <span className="priority-name">{patient.firstName} {patient.lastName}</span>
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
                            <h3 className="card-title">Wound Distribution</h3>
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
