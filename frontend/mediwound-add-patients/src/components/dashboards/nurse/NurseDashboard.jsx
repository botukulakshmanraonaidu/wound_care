import React, { useState, useEffect } from 'react';
import { User, FileText, Camera, CheckCircle2, Clock, Activity, CheckCircle, AlertCircle, Bell, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../../services/patientService';
import { nurseService } from '../../../services/nurseService';
import './NurseDashboard.css';

/* ─── Shift Task List ─── */
const ShiftTaskList = ({ refreshTrigger }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    nurseService.getTasks().then(data => {
      setTasks(data);
    }).finally(() => setLoading(false));
  }, [refreshTrigger]);

  const toggle = async (id, current) => {
    const next = current === 'completed' ? 'pending' : 'completed';
    await nurseService.updateTaskStatus(id, next);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
  };

  if (loading) return <p className="nurse-empty-state">Loading tasks...</p>;
  if (!tasks.length) return <p className="nurse-empty-state">No shift tasks assigned.</p>;

  return (
    <div className="nurse-task-list">
      {tasks.map(t => (
        <div
          key={t.id}
          className={`nurse-task-item ${t.status === 'completed' ? 'completed' : ''}`}
          onClick={() => toggle(t.id, t.status)}
        >
          <div className={`task-dot ${t.status === 'completed' ? 'done' : ''}`} />
          <div className="task-body">
            <p className="task-title">{t.title}</p>
            <div className="task-meta-row">
              <span className="task-time">{t.due_time || 'No time set'}</span>
              {t.patient_details && (
                <span className="task-patient-ref">
                  • {t.patient_details.first_name} {t.patient_details.last_name}
                </span>
              )}
            </div>
          </div>
          {t.status === 'completed'
            ? <CheckCircle size={16} className="task-icon-done" />
            : <Clock size={16} className="task-icon-pending" />}
        </div>
      ))}
    </div>
  );
};

/* ─── My Patients List ─── */
const MyPatientsList = ({ searchQuery, refreshTrigger }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReportId, setLoadingReportId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    patientService.getPatients('my').then(setPatients).finally(() => setLoading(false));
  }, [refreshTrigger]);

  const filtered = patients.filter(p =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleViewReport = async (e, patient) => {
    e.stopPropagation();
    setLoadingReportId(patient.id);
    setError(null);
    try {
      // Clear notifications (non-blocking)
      patientService.clearNotifications(patient.id).catch(() => { });

      // Fetch this patient's assessments
      const assessments = await patientService.getPatientAssessments(patient.id);

      if (!assessments || assessments.length === 0) {
        setError(`No assessment report found for ${patient.firstName} ${patient.lastName}.`);
        return;
      }

      // Most recent assessment
      const latestAssessment = assessments[0];

      // Store in sessionStorage as a reliable fallback so ReportPreview
      // can always read it even if router location.state is lost
      sessionStorage.setItem('nurse_report_assessment', JSON.stringify(latestAssessment));

      // Navigate to the same ReportPreview the doctor uses
      navigate('/reports', { state: { assessment: latestAssessment } });

    } catch (err) {
      console.error('Failed to load patient assessment:', err);
      setError('Failed to load report. Please try again.');
    } finally {
      setLoadingReportId(null);
    }
  };

  if (loading) return <p className="nurse-empty-state">Loading patients...</p>;
  if (!filtered.length) return <p className="nurse-empty-state">No patients assigned.</p>;

  return (
    <>
      {error && (
        <div className="nurse-report-error">
          ⚠ {error}
        </div>
      )}
      <div className="nurse-patient-list">
        {filtered.map(p => (
          <div key={p.id} className="nurse-patient-item">
            <div className="patient-avatar">
              <User size={16} />
            </div>
            <div className="patient-info">
              <p className="patient-name">{p.firstName} {p.lastName}</p>
              <p className="patient-meta">Room {p.roomNumber} • MRN: {p.mrn}</p>
            </div>
            <span className={`patient-status-badge ${p.status === 'Critical' ? 'critical' : 'stable'}`}>
              {p.status?.toUpperCase()}
            </span>
            <button
              className="nurse-view-report-btn"
              onClick={() => navigate(`/patients/profile/${p.id}`)}
              style={{ marginRight: '8px', borderColor: '#e2e8f0', color: '#64748b' }}
              title="View full patient profile"
            >
              <User size={13} />
              <span>View Profile</span>
            </button>
            <button
              className="nurse-view-report-btn"
              onClick={(e) => handleViewReport(e, p)}
              disabled={loadingReportId === p.id}
              title="View latest assessment report"
            >
              {loadingReportId === p.id ? (
                <span className="report-btn-loading">Loading…</span>
              ) : (
                <>
                  <FileText size={13} />
                  <span>View Report</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

/* ─── Staff Announcements ─── */
const StaffAnnouncements = ({ refreshTrigger }) => {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    nurseService.getAnnouncements().then(setAnnouncements);
  }, [refreshTrigger]);

  return (
    <div className="nurse-card">
      <div className="nurse-card-header">
        <AlertCircle size={14} className="header-icon-blue" />
        <h3 className="nurse-section-title">STAFF ANNOUNCEMENTS</h3>
      </div>
      {!announcements.length
        ? <p className="nurse-empty-state">No active announcements.</p>
        : announcements.map(a => (
          <div key={a.id} className="announcement-item">
            <p className="announcement-title">{a.title}</p>
            <p className="announcement-body">{a.message}</p>
            <span className="announcement-meta">{a.author_name} • {new Date(a.created_at).toLocaleDateString()}</span>
          </div>
        ))
      }
    </div>
  );
};

/* ─── Main Dashboard ─── */
const NurseDashboard = ({ user, searchQuery: externalSearchQuery = '' }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [stats, setStats] = useState({ active_patients: 0, doc_due: 0, scans: 0, completed: 0, unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const data = await patientService.getRecentNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const openAlerts = () => {
    setIsAlertsModalOpen(true);
    fetchAlerts();
  };

  const fetchDashboardData = async (force = false) => {
    const cacheKey = `nurse_dashboard_data_${user?.id || 'default'}`;

    // Check cache if not forced
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 1 * 60 * 1000) {
            setStats(data.stats);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
          }
        } catch (e) {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    setIsRefreshing(true);
    try {
      const newStats = await nurseService.getStats();
      setStats(newStats);
      setLastUpdated(new Date());

      // Save to cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: { stats: newStats },
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Failed to fetch nurse stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  useEffect(() => {
    fetchDashboardData();

    // Set up 60-second polling
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCards = [
    { label: 'Active Patients', value: stats.active_patients, sub: 'Assigned to you', icon: User, bg: '#EFF6FF', color: '#2563EB' },
    { label: 'Documentation Due', value: stats.doc_due, sub: 'Pending tasks', icon: FileText, bg: '#FFFBEB', color: '#D97706' },
    { label: 'Wound Scans', value: stats.scans, sub: 'Performed today', icon: Camera, bg: '#FEF2F2', color: '#EF4444' },
    { label: 'Completed', value: stats.completed, sub: 'Tasks today', icon: CheckCircle2, bg: '#F0FDF4', color: '#22C55E' },
  ];

  return (
    <div className="nurse-dashboard">

      {/* Header */}
      <div className="nurse-header">
        <div>
          <p className="nurse-date">{today}</p>
          <h1 className="nurse-title">Nurse Dashboard</h1>
          <div className="nurse-status-row">
            <span className="nurse-badge">ACTIVE SHIFT</span>
            <span className="nurse-status-text">Standard Nursing Shift • Clinical Information Sync</span>
          </div>
        </div>
        <div className="nurse-header-actions">
          <div className="refresh-status">
            {isRefreshing ? (
              <RefreshCw size={12} className="refresh-spin" />
            ) : (
              <span className="last-updated">Last sync: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
            )}
          </div>
          <button className="nurse-btn-outline nurse-alerts-btn" onClick={openAlerts}>
            <Bell size={16} />
            <span>ALERTS</span>
            {(stats.unread_count > 0 || notifications.length > 0) && <span className="alerts-count-dot" />}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="nurse-stats-grid">
        {statCards.map((s, i) => (
          <div
            key={i}
            className={`nurse-stat-card ${s.label === 'Wound Scans' || s.label === 'Active Patients' ? 'clickable' : ''}`}
            onClick={() => {
              if (s.label === 'Wound Scans') navigate('/assessments');
              if (s.label === 'Active Patients') navigate('/patients');
            }}
          >
            <div className="nurse-stat-top">
              <span className="nurse-stat-label">{s.label}</span>
              <div className="nurse-stat-icon" style={{ background: s.bg }}>
                <s.icon size={14} style={{ color: s.color }} />
              </div>
            </div>
            <p className="nurse-stat-value">{loading ? '—' : s.value}</p>
            <span className="nurse-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="nurse-quick-actions">
        <div className="nurse-action-primary" onClick={() => navigate('/assessments')}>
          <div className="action-icon-box primary-icon-box"><Activity size={20} /></div>
          <div>
            <p className="action-title">View Assessments</p>
            <p className="action-desc">Monitor wound healing progress and history</p>
          </div>
        </div>
        <div className="nurse-action-secondary" onClick={() => { /* Add logic for vitals if needed */ }}>
          <div className="action-icon-box secondary-icon-box"><Clock size={20} /></div>
          <div>
            <p className="action-title">Record Vitals</p>
            <p className="action-desc">Log temperature, BP, and heart rate</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="nurse-content-grid">
        <div className="nurse-card">
          <div className="nurse-card-header">
            <CheckCircle2 size={14} className="header-icon-blue" />
            <h3 className="nurse-section-title">TASKS &amp; RESPONSIBILITIES</h3>
          </div>
          <ShiftTaskList refreshTrigger={lastUpdated} />
        </div>

        {/* Right: Patients + Announcements */}
        <div className="nurse-right-col">
          <div className="nurse-card">
            <div className="nurse-card-header">
              <User size={14} className="header-icon-blue" />
              <h3 className="nurse-section-title">MY PATIENTS</h3>
            </div>
            <MyPatientsList searchQuery={searchQuery} refreshTrigger={lastUpdated} />
          </div>
          <StaffAnnouncements refreshTrigger={lastUpdated} />
        </div>
      </div>

      {/* Alerts Modal */}
      {isAlertsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAlertsModalOpen(false)}>
          <div className="modal-card alerts-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} className="header-icon-blue" />
                <h3 className="nurse-section-title" style={{ marginBottom: 0 }}>Clinical Alerts & Notifications</h3>
              </div>
              <button className="close-btn" onClick={() => setIsAlertsModalOpen(false)}>&times;</button>
            </div>
            <div className="alerts-modal-body">
              {loadingAlerts ? (
                <div className="nurse-empty-state">Loading clinical alerts...</div>
              ) : notifications.length > 0 ? (
                <div className="alerts-list">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className="alert-item"
                      onClick={() => {
                        setIsAlertsModalOpen(false);
                        navigate(`/patients/profile/${notif.patient_id || notif.patient}`);
                      }}
                    >
                      <div className="alert-icon-box">
                        <Activity size={14} />
                      </div>
                      <div className="alert-content">
                        <p className="alert-text">{notif.message}</p>
                        <span className="alert-time">{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="nurse-empty-state">No recent clinical alerts.</div>
              )}
            </div>
            <div className="alerts-modal-footer">
              <button className="nurse-btn-outline" style={{ width: '100%' }} onClick={() => setIsAlertsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseDashboard;