import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { loginUser } from "../../API/authApi";

const Login = ({ onLogin }) => {
  // 🔹 State for form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 React Router navigation
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!password.trim()) {
      setError("Password is required");
      return false;
    }
    return true;
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    loginUser(trimmedEmail, trimmedPassword)
      .then((res) => {
        setLoading(false);
        const userData = res.data; // { access, refresh, role, email, full_name, is_superuser, is_staff, ... }

        // Store authentication data in localStorage
        localStorage.setItem('access_token', userData.access);
        localStorage.setItem('refresh_token', userData.refresh);
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('userName', userData.full_name);
        localStorage.setItem('accessLevel', userData.access_level || 'Limited');
        localStorage.setItem('isSuperuser', userData.is_superuser || false);
        localStorage.setItem('isStaff', userData.is_staff || false);
        localStorage.setItem('isAuthenticated', 'true');

        if (onLogin) onLogin(userData);
        navigate("/dashboard");
      })
      .catch((err) => {
        setLoading(false);
        const serverError = err.response?.data?.error || "Invalid email or password";
        setError(serverError);
      });
  };

  return (
    <div className="login-container">
      <header className="login-header">
        <div className="login-header-left">
          <div className="logo-box">
            <svg width="40" height="40" viewBox="0 0 116 116" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="116" height="116" rx="7.93162" fill="#2D63A9" fill-opacity="0.16" />
              <path d="M51.3996 30.5735C49.6494 30.5735 47.9708 31.2688 46.7332 32.5064C45.4956 33.744 44.8003 35.4226 44.8003 37.1728V44.8721H38.2009C36.4507 44.8721 34.7721 45.5674 33.5345 46.805C32.2969 48.0426 31.6016 49.7212 31.6016 51.4715V64.6042C31.6016 66.3544 32.2969 68.033 33.5345 69.2706C34.7721 70.5082 36.4507 71.2035 38.2009 71.2035H44.8003V77.8029C44.8003 79.5532 45.4956 81.2317 46.7332 82.4693C47.9708 83.707 49.6494 84.4023 51.3996 84.4023H64.5984C66.3486 84.4023 68.0272 83.707 69.2648 82.4693C70.5024 81.2317 71.1977 79.5532 71.1977 77.8029V71.2035H77.7971C79.5473 71.2035 81.2259 70.5082 82.4635 69.2706C83.7011 68.033 84.3964 66.3544 84.3964 64.6042V51.4055C84.3964 49.6552 83.7011 47.9766 82.4635 46.739C81.2259 45.5014 79.5473 44.8061 77.7971 44.8061H71.1977V37.1728C71.1977 35.4226 70.5024 33.744 69.2648 32.5064C68.0272 31.2688 66.3486 30.5735 64.5984 30.5735H51.3996Z" fill="#2D63A9" />
            </svg>
          </div>
          <div>
            <h1>Wound Assessment Tool</h1>
            <p>Hospital - Grade Diagnostics</p>
          </div>
        </div>
      </header>

      <div className="login-card">
        <div className="lock-icon-container">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lock-icon">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2>Welcome Back</h2>
        <p className="subtitle">Please Sign In To Access Secure Patient Records</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label>Email Or Hospital ID</label>
            <div className="input-with-icon">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error && !email ? "input-error" : ""}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error && !password ? "input-error" : ""}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="login-extras">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember Me</span>
            </label>
            <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
