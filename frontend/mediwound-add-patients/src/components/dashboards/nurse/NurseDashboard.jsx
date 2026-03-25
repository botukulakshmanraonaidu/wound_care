import React, { useState, useEffect } from 'react';
import { User, Users, FileText, Camera, CircleCheck, Clock, Activity, CircleAlert, Bell, RefreshCw, Plus } from 'lucide-react';
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
      const dynamicTasks = Array.isArray(data) ? data : [];
      const staticTasks = [
        { id: 'static-1', title: 'Morning Vital Signs Check', status: 'pending', due: '08:00 AM', priority: 'High' },
        { id: 'static-2', title: 'Administer Morning Medications', status: 'pending', due: '09:00 AM', priority: 'High' },
        { id: 'static-3', title: 'Wound Dressing Changes', status: 'pending', due: '11:00 AM', priority: 'Medium' },
        { id: 'static-4', title: 'Review Patient Charts', status: 'pending', due: '02:00 PM', priority: 'Low' }
      ];
      setTasks([...staticTasks, ...dynamicTasks]);
    }).catch(err => {
      console.error('Failed to fetch tasks:', err);
    }).finally(() => setLoading(false));
  }, [refreshTrigger]);

  const toggle = async (id, current) => {
    // In DRF, status might be a boolean 'completed' or a string 'pending'/'completed'
    // The current code uses 'completed'/'pending' strings in state.
    // Let's stick to that for UI consistency.
    const isCompleted = current === 'completed' || current === true;
    const nextStatus = isCompleted ? 'pending' : 'completed';
    const nextCompletedBool = !isCompleted;

    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus, completed: nextCompletedBool } : t));

    // Only call API for dynamic tasks
    if (!String(id).startsWith('static-')) {
      try {
        await nurseService.updateTaskStatus(id, nextCompletedBool);
      } catch (err) {
        console.error('Failed to update task status:', err);
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: current, completed: isCompleted } : t));
      }
    }
  };

  if (loading) return <p className="nurse-empty-state">Loading tasks...</p>;
  if (!tasks.length) return <p className="nurse-empty-state">No shift tasks assigned.</p>;

  return (
    <div className="nurse-task-table-container overflow-x-auto w-full">
      <table className="nurse-task-table min-w-[600px] w-full">
        <thead>
          <tr>
            <th style={{ width: '45px' }}>Done</th>
            <th>Task Details</th>
            <th>Patient</th>
            <th>Due</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const isCompleted = t.status === 'completed' || t.completed === true;
            return (
              <tr key={t.id} className={isCompleted ? 'completed' : ''}>
                <td style={{ textAlign: 'center' }}>
                  <div
                    className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
                    onClick={() => toggle(t.id, t.status)}
                  >
                    {isCompleted && <CircleCheck size={14} />}
                  </div>
                </td>
                <td>
                  <div className="task-title-cell">{t.title}</div>
                  {t.description && <div className="nurse-task-desc">{t.description}</div>}
                </td>
                <td>
                  {t.patient_details ? (
                    <span className="task-patient-ref">
                      {t.patient_details.first_name} {t.patient_details.last_name}
                    </span>
                  ) : <span style={{ color: '#94a3b8', fontSize: '11px' }}>General</span>}
                </td>
                <td className="task-time">{t.due || t.due_time || 'No time set'}</td>
                <td>
                  <span className={`task-priority-badge priority-${(t.priority || 'Medium').toLowerCase()}`}>
                    {t.priority || 'Medium'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


/* ─── Newly Assigned Patients List ─── */
const NewlyAssignedList = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getPatients('nurse_recent').then(data => {
      // Filter out patients that have been viewed since they were created/updated
      const unviewed = data.filter(p => {
        const lastViewed = localStorage.getItem(`nurse_viewed_patient_${p.id}`);
        // If never viewed, or if viewed before it was updated/created
        const pUpdated = new Date(p.updated_at || p.created_at || 0).getTime();
        return !lastViewed || Number(lastViewed) < pUpdated;
      });
      setPatients(unviewed.slice(0, 5)); // Keep it small, like the doctor dashboard
    }).finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleReview = (patient) => {
    localStorage.setItem(`nurse_viewed_patient_${patient.id}`, Date.now().toString());
    navigate(`/patients/profile/${patient.id}`);
  };

  if (loading) return <div className="nurse-empty-state" style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div className="appointments-list overflow-x-auto w-full pt-2 sm:pt-0" style={{ padding: '0 20px 20px 20px' }}>
      {patients.length > 0 ? (
        <table className="mini-table min-w-[400px] w-full">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Admission</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>
                  <div className="patient-mini-info">
                    <span className="p-name">{patient.first_name || patient.firstName} {patient.last_name || patient.lastName}</span>
                    <span className="p-mrn">{patient.mrn}</span>
                  </div>
                </td>
                <td>
                  {(() => {
                    const dateStr = patient.admissionDate || patient.created_at;
                    if (!dateStr) return "N/A";
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) return "Invalid Date";
                    
                    return date.toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    }).replace(', 12:00 AM', '');
                  })()}
                </td>
                <td>
                  <button 
                    className="btn-view-mini"
                    onClick={() => handleReview(patient)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
          No new patients assigned to you right now.
        </div>
      )}
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
      // Set viewed in local storage
      localStorage.setItem(`nurse_viewed_patient_${patient.id}`, Date.now().toString());

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
              onClick={() => {
                localStorage.setItem(`nurse_viewed_patient_${p.id}`, Date.now().toString());
                navigate(`/patients/profile/${p.id}`);
              }}
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
        <CircleAlert size={14} className="header-icon-blue" />
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

/* ─── Create Task Modal ─── */
const CreateTaskModal = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueTime, setDueTime] = useState('Today, 05:00 PM');
  const [priority, setPriority] = useState('Medium');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      patientService.getPatients('my').then(setPatients);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await nurseService.createTask({
        title,
        description,
        due_time: dueTime,
        priority,
        patient: selectedPatient || null
      });
      onCreated();
      onClose();
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueTime('Today, 05:00 PM');
      setSelectedPatient('');
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} className="header-icon-blue" />
            <h3 className="nurse-section-title" style={{ marginBottom: 0 }}>Create New Task</h3>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>TASK TITLE</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Change dressings"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>DESCRIPTION (OPTIONAL)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              rows={3}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>DUE TIME</label>
              <input
                type="text"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                placeholder="e.g. Today, 05:00 PM"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>PRIORITY</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>PATIENT (OPTIONAL)</label>
            <select
              value={selectedPatient}
              onChange={e => setSelectedPatient(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
            >
              <option value="">No patient linked</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="nurse-btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="nurse-btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
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
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
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
      const now = new Date();
      setLastUpdated(now);

      // Save to cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: { stats: newStats },
        timestamp: now.getTime()
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
    if (user) {
      fetchDashboardData();
    }

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
          <div className="refresh-status" onClick={() => fetchDashboardData(true)} style={{ cursor: 'pointer' }}>
            {isRefreshing ? (
              <RefreshCw size={12} className="refresh-spin" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={10} />
                <span className="last-updated">Sync: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
              </div>
            )}
          </div>
          <button className="nurse-btn-outline nurse-alerts-btn" onClick={openAlerts}>
            <Bell size={16} />
            <span>ALERTS</span>
            {(stats.unread_count > 0 || notifications.length > 0) && <span className="alerts-count-dot" />}
          </button>
          
          {/* Nurse Profile Image */}
          <div className="nurse-avatar-container hidden sm:block">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Nurse Profile" className="nurse-avatar-img" />
            ) : (
              <div className="nurse-avatar-placeholder">
                <User size={24} color="#64748b" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6 w-full">
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full items-start">
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          <div className="nurse-card">
            <div className="nurse-card-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} className="header-icon-blue" />
                <h3 className="nurse-section-title">TASKS &amp; RESPONSIBILITIES</h3>
              </div>
              <button
                className="nurse-btn-outline"
                style={{ padding: '4px 8px', fontSize: '10px' }}
                onClick={() => setIsTaskModalOpen(true)}
              >
                <Plus size={12} />
                <span>ADD TASK</span>
              </button>
            </div>
            <ShiftTaskList refreshTrigger={lastUpdated} />
          </div>

          <div className="nurse-card">
            <div className="nurse-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={14} className="header-icon-blue" />
                <div>
                  <h3 className="nurse-section-title" style={{ marginBottom: 0 }}>NEWLY ASSIGNED PATIENTS</h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Awaiting your initial review</div>
                </div>
              </div>
            </div>
            <NewlyAssignedList refreshTrigger={lastUpdated} />
          </div>
        </div>

        {/* Right: Patients + Announcements */}
        <div className="xl:col-span-1 flex flex-col gap-6 w-full">
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

      {/* Add Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onCreated={() => fetchDashboardData(true)}
      />
    </div>
  );
};

export default NurseDashboard;