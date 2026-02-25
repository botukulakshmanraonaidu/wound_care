import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Bell, LogOut, Activity, Database, Shield } from 'lucide-react';
import { patientService } from '../../services/patientService';
import './Sidebar.css';

function Sidebar({ onLogout, userRole: rawRole, accessLevel }) {
  const userRole = rawRole?.toLowerCase();
  const isSuperuser = localStorage.getItem('isSuperuser') === 'true';
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await patientService.getRecentNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Sidebar: Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s poll

    const handleRefresh = () => fetchNotifications();
    window.addEventListener('refreshNotifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, []);

  const openAlerts = () => {
    setIsAlertsModalOpen(true);
    setLoadingAlerts(true);
    fetchNotifications().finally(() => setLoadingAlerts(false));
  };



  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  ];

  // Access patient management if doctor or nurse
  if (!isSuperuser && (['doctor', 'nurse'].includes(userRole) || !userRole)) {
    menuItems.push({ icon: Users, label: 'Patients', path: '/patients' });
    menuItems.push({ icon: Activity, label: 'Assessments', path: '/assessments' });
  }

  // Admin menu items (for admins and superusers)
  if (userRole === 'admin' || isSuperuser) {
    menuItems.push({ icon: Shield, label: 'Role Management', path: '/roles' });

    // Restricted Admin items (Full access or superuser)
    if (accessLevel === 'Full' || isSuperuser) {
      menuItems.push({ icon: FileText, label: 'System Logs', path: '/logs' });
      menuItems.push({ icon: Database, label: 'Storage', path: '/storage' });
    }
  }

  const roleLabels = {
    'doctor': 'DOCTOR',
    'admin': 'SYSTEM ADMIN',
    'nurse': 'CLINICAL STAFF'
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="logo-box">
            <svg width="32" height="32" viewBox="0 0 116 116" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="116" height="116" rx="7.93162" fill="#2D63A9" fill-opacity="0.16" />
              <path d="M51.3996 30.5735C49.6494 30.5735 47.9708 31.2688 46.7332 32.5064C45.4956 33.744 44.8003 35.4226 44.8003 37.1728V44.8721H38.2009C36.4507 44.8721 34.7721 45.5674 33.5345 46.805C32.2969 48.0426 31.6016 49.7212 31.6016 51.4715V64.6042C31.6016 66.3544 32.2969 68.033 33.5345 69.2706C34.7721 70.5082 36.4507 71.2035 38.2009 71.2035H44.8003V77.8029C44.8003 79.5532 45.4956 81.2317 46.7332 82.4693C47.9708 83.707 49.6494 84.4023 51.3996 84.4023H64.5984C66.3486 84.4023 68.0272 83.707 69.2648 82.4693C70.5024 81.2317 71.1977 79.5532 71.1977 77.8029V71.2035H77.7971C79.5473 71.2035 81.2259 70.5082 82.4635 69.2706C83.7011 68.033 84.3964 66.3544 84.3964 64.6042V51.4055C84.3964 49.6552 83.7011 47.9766 82.4635 46.739C81.2259 45.5014 79.5473 44.8061 77.7971 44.8061H71.1977V37.1728C71.1977 35.4226 70.5024 33.744 69.2648 32.5064C68.0272 31.2688 66.3486 30.5735 64.5984 30.5735H51.3996Z" fill="#2D63A9" />
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-name">MediWound AI</div>
            <div className="brand-subtitle">{roleLabels[userRole] || 'DOCTOR'}</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-middle">
        <button className="sidebar-item sidebar-alerts" onClick={openAlerts}>
          <Bell size={20} />
          <span>Alerts</span>
          {notifications.length > 0 && (
            <span className="sidebar-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
          )}
        </button>
      </div>

      <div className="sidebar-footer">
        {/* Settings restricted to doctor in this context? User said "settings also" */}
        {/* Settings accessible by all roles */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
          }
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <button className="sidebar-item" onClick={onLogout}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Sidebar Alerts Modal */}
      {isAlertsModalOpen && (
        <div className="modal-overlay sidebar-alerts-overlay" onClick={() => setIsAlertsModalOpen(false)}>
          <div className="modal-card alerts-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: '#2563EB' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: 0 }}>Clinical Alerts</h3>
              </div>
              <button className="close-btn" onClick={() => setIsAlertsModalOpen(false)}>&times;</button>
            </div>
            <div className="alerts-modal-body" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {loadingAlerts ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading clinical alerts...</div>
              ) : notifications.length > 0 ? (
                <div className="alerts-list">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className="sidebar-alert-item"
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => {
                        setIsAlertsModalOpen(false);
                        navigate(`/patients/profile/${notif.patient_id || notif.patient}`);
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <p style={{ fontSize: '13px', color: '#1e293b', margin: '0 0 4px 0', fontWeight: 500 }}>{notif.message}</p>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(notif.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No recent clinical alerts.</div>
              )}
            </div>
            <div style={{ padding: '12px', borderTop: '1px solid #F1F5F9' }}>
              <button className="sidebar-modal-close-btn" style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                background: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }} onClick={() => setIsAlertsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
