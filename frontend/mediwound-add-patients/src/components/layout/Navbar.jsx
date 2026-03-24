import React, { useState, useEffect } from 'react';
import { Search, HelpCircle, Bell, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthAPI from '../../API/authApi';
import './Navbar.css';

function Navbar({ userName, userJobTitle, notificationCount, onNotificationClick, toggleSidebar }) {
  const [profilePic, setProfilePic] = useState(localStorage.getItem('profilePicture'));
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
    // Sync profile picture when localStorage changes (via storage event)
    const handleStorageChange = () => {
      setProfilePic(localStorage.getItem('profilePicture'));
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event check (Settings dispatches a generic Event('storage'))
    // Some browsers don't trigger 'storage' event on the same window
    // so we handle both.
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
    <nav className="navbar flex sticky top-0 z-40 bg-white border-b border-gray-100 px-2 sm:px-4 py-1 sm:py-2 h-12 sm:h-14 items-center justify-between w-full shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar} 
            className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-blue-600 focus:outline-none rounded-md touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="navbar-title text-lg md:text-xl font-bold text-gray-800 hidden sm:block">Dashboard Overview</div>
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
        <div className="navbar-user pl-2 sm:pl-4">
          <div className="navbar-user-info hidden sm:flex">
            <div className="navbar-user-name text-xs sm:text-sm">{userName || "User"}</div>
            <div className="navbar-user-role text-[10px] sm:text-xs">{userJobTitle || "Specialist"}</div>
          </div>
          <div className="navbar-user-avatar h-8 w-8 sm:h-10 sm:w-10">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="navbar-avatar-img" />
            ) : (
              <User size={20} />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
