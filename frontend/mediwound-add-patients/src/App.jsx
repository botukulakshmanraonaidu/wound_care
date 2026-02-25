import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// =====================
// Pages & Layout
// =====================
// =====================
// Pages & Layout
// =====================
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./components/dashboards/doctor/Dashboard";
import AdminDashboard from "./components/dashboards/admin/AdminDashboard";
import NurseDashboard from "./components/dashboards/nurse/NurseDashboard";
import PatientList from "./components/dashboards/doctor/patients/PatientList";
import AddPatient from "./components/dashboards/doctor/patients/AddPatient";
import Login from "./components/security/Login";
import Onboarding from "./components/security/Onboarding";
import ReportPreview from "./components/dashboards/doctor/reports/ReportPreview";
import Settings from "./components/dashboards/doctor/settings/Settings";
import Assessment from "./components/dashboards/doctor/assessments/Assessment";
import RoleManagement from "./components/dashboards/admin/RoleManagement";
import PatientProfileView from "./components/dashboards/doctor/patients/PatientProfileView";
import ClinicalPortal from "./components/dashboards/doctor/patients/Clinicalportal";
import SystemLogs from "./components/dashboards/admin/SystemLogs";
import Storage from "./components/dashboards/admin/Storage";
import LoadingScreen from "./components/common/LoadingScreen";

import { logoutUser } from "./API/authApi";
import "./App.css";


function App() {
  // 🔐 Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null);
  const [userName, setUserName] = useState("User");
  const [userJobTitle, setUserJobTitle] = useState("");
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Disabled loading screen

  // 🔄 Restore login state on refresh
  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated") === "true";
    const onboarded = localStorage.getItem("hasCompletedOnboarding") === "true";
    const role = localStorage.getItem("userRole")?.toLowerCase();
    const access = localStorage.getItem("accessLevel");
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId");
    const job = localStorage.getItem("userJobTitle");
    const superuser = localStorage.getItem("isSuperuser") === "true";

    setIsAuthenticated(auth);
    setHasCompletedOnboarding(onboarded);
    setUserRole(role);
    setAccessLevel(access);
    setIsSuperuser(superuser);
    if (id) setUserId(id);
    if (name) setUserName(name);
    if (job) setUserJobTitle(job);

    // Superusers skip onboarding
    if (superuser && auth) {
      setHasCompletedOnboarding(true);
      localStorage.setItem("hasCompletedOnboarding", "true");
    }
  }, []);

  // Listen for profile updates
  useEffect(() => {
    const handleStorageChange = () => {
      const name = localStorage.getItem("userName");
      if (name) setUserName(name);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ Called after successful login
  const handleLogin = (userData) => {
    const role = userData.role?.toLowerCase();
    const access = userData.access_level;
    const name = userData.full_name || "User";
    const id = userData.id;
    const job = userData.job_title || userData.role || "";
    const superuser = userData.is_superuser || false;

    setIsAuthenticated(true);
    setUserRole(role);
    setAccessLevel(access);
    setUserName(name);
    setUserId(id);
    setUserJobTitle(job);
    setIsSuperuser(superuser);

    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userId", id);
    localStorage.setItem("userRole", role);
    localStorage.setItem("accessLevel", access);
    localStorage.setItem("access_token", userData.access);
    localStorage.setItem("refresh_token", userData.refresh);
    localStorage.setItem("email", userData.email);
    localStorage.setItem("userName", name);
    localStorage.setItem("userJobTitle", job);
    localStorage.setItem("isSuperuser", superuser);

    // Superusers skip onboarding
    if (superuser) {
      setHasCompletedOnboarding(true);
      localStorage.setItem("hasCompletedOnboarding", "true");
    }
  };

  // 🎓 Called after onboarding completion
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem("hasCompletedOnboarding", "true");
    // Removed 5s loading here for immediate transition to login/dashboard
  };


  // ... imports

  // 🚪 Logout (optional but useful)
  // 🚪 Logout (optional but useful)
  const handleLogout = () => {
    // Attempt to log out on server (fire and forget)
    logoutUser().catch(err => console.error("Logout log failed:", err));

    setIsAuthenticated(false);
    setHasCompletedOnboarding(false);
    setUserRole(null);
    setAccessLevel(null);
    setUserId(null);
    setUserName("User");
    setUserJobTitle("");
    localStorage.clear();
  };

  // 🖥️ Helper to render dashboard based on role
  const renderDashboard = () => {
    const user = { id: userId, full_name: userName };

    // Superusers always get Admin Dashboard regardless of role_type
    if (isSuperuser) {
      return <AdminDashboard />;
    }

    switch (userRole?.toLowerCase()) {
      case 'admin':
        return <AdminDashboard />;
      case 'nurse':
        return <NurseDashboard user={user} />;
      case 'doctor':
      default:
        return <Dashboard user={user} />;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        {!hasCompletedOnboarding ? (
          // 🎓 Step 1: Onboarding (must be completed first)
          <Route
            path="/*"
            element={<Onboarding onComplete={handleOnboardingComplete} />}
          />
        ) : (
          <>
            {/* =====================
                LOGIN ROUTE
               ===================== */}
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              }
            />

            {/* =====================
                PROTECTED ROUTES
               ===================== */}
            <Route
              path="/*"
              element={
                !isAuthenticated ? (
                  //  Not logged in → login page
                  <Navigate to="/login" replace />
                ) : (
                  //  Logged in and onboarded → show app layout
                  <div className="app-container">
                    <Sidebar onLogout={handleLogout} userRole={userRole} accessLevel={accessLevel} />

                    <div className="content-wrapper">
                      <Navbar userName={userName} userJobTitle={userJobTitle} />

                      <main className="main-content">
                        <Routes>
                          <Route path="/dashboard" element={renderDashboard()} />

                          {/* Nurse Specific Access Routes */}
                          {userRole === 'nurse' && (
                            <>
                              <Route path="/patients" element={<PatientList />} />
                              <Route path="/patients/profile/:id" element={<PatientProfileView />} />
                              <Route path="/assessments" element={<Assessment />} />
                              <Route path="/clinical-portal" element={<ClinicalPortal />} />
                              <Route path="/reports" element={<ReportPreview />} />
                              <Route path="/settings" element={<Settings />} />
                            </>
                          )}

                          {/* Doctor Specific Access Routes */}
                          {(userRole === 'doctor' || !userRole) && (
                            <>
                              <Route path="/patients" element={<PatientList />} />
                              <Route path="/patients/add" element={<AddPatient />} />
                              <Route path="/patients/edit/:id" element={<AddPatient />} />
                              <Route path="/patients/profile/:id" element={<PatientProfileView />} />
                              <Route path="/assessments" element={<Assessment />} />
                              <Route path="/clinical-portal" element={<ClinicalPortal />} />
                              <Route path="/reports" element={<ReportPreview />} />
                              <Route path="/settings" element={<Settings />} />
                            </>
                          )}

                          {/* Admin Only Routes (Admin or Superuser) */}
                          {(userRole === 'admin' || isSuperuser) && (
                            <>
                              <Route path="/roles" element={<RoleManagement accessLevel={accessLevel} />} />
                              <Route path="/logs" element={<SystemLogs />} />
                              <Route path="/storage" element={<Storage />} />
                              <Route path="/settings" element={<Settings />} />
                            </>
                          )}

                          {/* Default landing for auth'd users */}
                          <Route
                            path="/"
                            element={<Navigate to="/dashboard" replace />}
                          />

                          {/* Catch-all for restricted routes → back to dashboard */}
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                )
              }
            />


          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
