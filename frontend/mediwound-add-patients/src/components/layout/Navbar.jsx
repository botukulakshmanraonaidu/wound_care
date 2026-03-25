import React, { useState, useEffect } from 'react';
import { Search, HelpCircle, Bell, User, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthAPI from '../../API/authApi';
import './Navbar.css';

function Navbar({ userName, userJobTitle, profilePic: propProfilePic, notificationCount, onNotificationClick, toggleSidebar }) {
  const [profilePic, setProfilePic] = useState(propProfilePic || localStorage.getItem('profilePicture'));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [internalCount, setInternalCount] = useState(0);

  // Sync with prop when it changes
  useEffect(() => {
    if (propProfilePic) {
      setProfilePic(propProfilePic);
    }
  }, [propProfilePic]);
  const navigate = useNavigate();

  const toggleProfileModal = (e) => {
    if (e) e.stopPropagation();
    setIsProfileModalOpen(!isProfileModalOpen);
  };

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
    // Sync profile picture when localStorage changes (via storage event)
    const handleStorageChange = () => {
      setProfilePic(localStorage.getItem('profilePicture'));
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event check (Settings dispatches a generic Event('storage'))
    const handleCustomStorage = (e) => {
      if (e.type === 'storage') {
        handleStorageChange();
      }
    };
    window.addEventListener('storage', handleCustomStorage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage', handleCustomStorage);
    };
  }, []);

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
    <>
      <nav className="navbar flex sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-16 items-center justify-between w-full shadow-sm">
        <div className="flex items-center gap-3">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="navbar-toggle-btn sm:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>
          )}
          <div className="navbar-title text-gray-800 hidden sm:block">Dashboard Overview</div>
        </div>

        <div className="navbar-center hidden md:flex flex-1 justify-center px-4">
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
          <button className="navbar-icon-btn" aria-label="Help">
            <Bell size={20} />
          </button>
          <div className="navbar-notification">
            <button className="navbar-icon-btn" aria-label="Notifications" onClick={handleClick}>
              <Bell size={20} />
              {typeof displayCount === 'number' && displayCount > 0 && (
                <span className="notification-badge">
                  {displayCount > 9 ? '9+' : displayCount}
                </span>
              )}
            </button>
          </div>
          
          <div className="navbar-user">
            <div className="navbar-user-info hidden sm:flex">
              <div className="navbar-user-name text-xs sm:text-sm">{userName || "User"}</div>
              <div className="navbar-user-role text-[10px] sm:text-xs">{userJobTitle || "Specialist"}</div>
            </div>
            <div className="navbar-user-avatar" onClick={toggleProfileModal}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="navbar-avatar-img" />
              ) : (
                <User size={20} />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Picture Enlarged Modal */}
      {isProfileModalOpen && (
        <div className="profile-modal-overlay" onClick={toggleProfileModal}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={toggleProfileModal}>
              <X size={24} />
            </button>
            <div className="profile-modal-image-container">
              {profilePic ? (
                <img src={profilePic} alt="Enlarged Profile" className="profile-modal-img" />
              ) : (
                <div className="profile-modal-placeholder">
                  <User size={120} />
                </div>
              )}
            </div>
            <div className="profile-modal-footer">
              <h3 className="profile-modal-name">{userName || "User"}</h3>
              <p className="profile-modal-role">{userJobTitle || "Specialist"}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
