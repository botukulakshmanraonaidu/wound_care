import React, { useState, useEffect } from 'react';
import { Search, HelpCircle, Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthAPI from '../../API/authApi';
import './Navbar.css';

function Navbar({ userName, userJobTitle, notificationCount, onNotificationClick }) {
  const [internalCount, setInternalCount] = useState(0);
  const navigate = useNavigate();

  // Determine which count to use
  const isControlled = typeof notificationCount === 'number';
  const displayCount = isControlled ? notificationCount : internalCount;

  const fetchNotifications = async () => {
    try {
      const response = await AuthAPI.get(`api/patients/notifications/?t=${Date.now()}`);
      if (response.status === 200) {
        setInternalCount(response.data.length);
      }
    } catch (error) {
      console.error('Navbar: Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    // Only poll if not controlled externally
    if (!isControlled) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s poll

      // Listen for global refresh events
      const handleRefresh = () => fetchNotifications();
      window.addEventListener('refreshNotifications', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [isControlled]);

  const handleClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      const userRole = localStorage.getItem('userRole')?.toLowerCase();
      if (userRole === 'nurse') {
        navigate('/patients');
      } else {
        navigate('/clinical-portal');
      }
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-title">Dashboard Overview</div>

      <div className="navbar-center">
        <div className="navbar-search">
          <Search size={16} className="navbar-search-icon" />
          <input
            type="text"
            placeholder="Search patient MRN..."
            className="navbar-search-input"
          />
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-icon-btn" title="Help">
          <HelpCircle size={20} />
        </button>
        <button
          className="navbar-icon-btn navbar-notification"
          title="Notifications"
          onClick={handleClick}
        >
          <Bell size={20} />
          {typeof displayCount === 'number' && displayCount > 0 && (
            <span className="notification-badge">
              {displayCount > 9 ? '9+' : displayCount}
            </span>
          )}
        </button>
        <div className="navbar-user">
          <div className="navbar-user-info">
            <div className="navbar-user-name">{userName || "User"}</div>
            <div className="navbar-user-role">{userJobTitle || "Specialist"}</div>
          </div>
          <div className="navbar-user-avatar">
            <User size={20} />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
