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
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
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

import { logoutUser, getProfile } from "./API/authApi";
import "./App.css";

function App() {
  // 🔐 Authentication state - Hydrate immediately from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("isAuthenticated") === "true");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => localStorage.getItem("hasCompletedOnboarding") === "true");
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
  const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole")?.toLowerCase());
  const [accessLevel, setAccessLevel] = useState(() => localStorage.getItem("accessLevel"));
  const [userName, setUserName] = useState(() => localStorage.getItem("userName") || "User");
  const [userJobTitle, setUserJobTitle] = useState(() => localStorage.getItem("userJobTitle") || "");
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem("profilePicture"));
  const [isSuperuser, setIsSuperuser] = useState(() => localStorage.getItem("isSuperuser") === "true");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch latest profile info if authenticated (background refresh)
    if (isAuthenticated) {
      getProfile().then(res => {
        const { full_name, job_title, role: backendRole, profile_picture } = res.data;
        if (full_name) {
          setUserName(full_name);
          localStorage.setItem("userName", full_name);
        }
        const finalJob = job_title || backendRole || "";
        if (finalJob) {
          setUserJobTitle(finalJob);
          localStorage.setItem("userJobTitle", finalJob);
        }
        if (profile_picture) {
          setProfilePic(profile_picture);
          localStorage.setItem("profilePicture", profile_picture);
        }
      }).catch(err => console.error("App: Failed to fetch profile", err));
    }

    // Superusers skip onboarding
    if (isSuperuser && isAuthenticated) {
      setHasCompletedOnboarding(true);
      localStorage.setItem("hasCompletedOnboarding", "true");
    }
  }, [isAuthenticated, isSuperuser]);

  // Listen for profile updates (Settings changes)
  useEffect(() => {
    const handleStorageChange = () => {
      const name = localStorage.getItem("userName");
      const job = localStorage.getItem("userJobTitle");
      const pic = localStorage.getItem("profilePicture");
      
      if (name) setUserName(name);
      if (job) setUserJobTitle(job);
      if (pic) setProfilePic(pic);
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
    if (userData.profile_picture) {
      localStorage.setItem("profilePicture", userData.profile_picture);
      setProfilePic(userData.profile_picture);
    }

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
    setProfilePic(null);
    localStorage.clear();
  };

  // 🖥️ Helper to render dashboard based on role
  const renderDashboard = () => {
    const user = { 
      id: userId, 
      full_name: userName, 
      job_title: userJobTitle, 
      profile_picture: profilePic 
    };

    // Superusers always get Admin Dashboard regardless of role_type
    if (isSuperuser) {
      return <AdminDashboard user={user} />;
    }

    switch (userRole?.toLowerCase()) {
      case 'admin':
        return <AdminDashboard user={user} />;
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
                  <div className="flex h-screen bg-gray-50 overflow-hidden w-full relative">
                    <Sidebar 
                      onLogout={handleLogout} 
                      userRole={userRole} 
                      accessLevel={accessLevel} 
                      isOpen={isMobileSidebarOpen} 
                      onClose={() => setIsMobileSidebarOpen(false)} 
                    />

                    <div className="layout-content-wrapper flex-1 flex flex-col min-w-0 overflow-hidden">
                      <Navbar 
                        userName={userName} 
                        userJobTitle={userJobTitle} 
                        userRole={userRole}
                        profilePic={profilePic}
                        toggleSidebar={() => setIsMobileSidebarOpen(true)} 
                      />

                      <main className="main-content flex-1 overflow-y-auto overflow-x-hidden pt-4 px-4 md:px-6 md:pt-6 bg-gray-50 flex flex-col">
                        <div className="flex-grow">
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
                                <Route path="/patients" element={<PatientList />} />
                                <Route path="/patients/add" element={<AddPatient />} />
                                <Route path="/patients/edit/:id" element={<AddPatient />} />
                                <Route path="/patients/profile/:id" element={<PatientProfileView />} />
                                <Route path="/assessments" element={<Assessment />} />
                                <Route path="/reports" element={<ReportPreview />} />
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
                        </div>
                        <Footer />
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
