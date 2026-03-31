import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import UserTracker from "./pages/backOffice/UserTracker";
import Dashboard from "./pages/backOffice/Dashboard";
import ActivityLogs from "./pages/backOffice/ActivityLogs";
import ActivityDetail from "./pages/backOffice/ActivityDetail";
import RoleRequests from "./pages/backOffice/RoleRequests";
import MyActivity from "./pages/MyActivity";

// Front Office Imports
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { Home } from "./pages/frontOffice/pages/Home";
import WorldMap from "./pages/frontOffice/pages/WorldMap";
import TrainingGrounds from "./pages/frontOffice/pages/TrainingGrounds";
import { TrainingLevel } from "./pages/frontOffice/pages/TrainingLevel";
import BattleArena from "./pages/frontOffice/pages/BattleArena";
import CommanderDashboard from "./pages/frontOffice/pages/CommanderDashboard";
import Armory from "./pages/frontOffice/pages/Armory";
import Settings from "./pages/frontOffice/pages/Settings";
import { UnityCastlePage } from "./pages/frontOffice/pages/UnityCastlePage";
import RequestRecruiterRole from "./pages/frontOffice/pages/RequestRecruiterRole";
import CreateProgrammingRoom from "./pages/frontOffice/pages/CreateProgrammingRoom";
import ProgrammingRooms from "./pages/frontOffice/pages/ProgrammingRooms";
import { Navbar } from "./pages/frontOffice/components/layout/Navbar";
import { Footer } from "./pages/frontOffice/components/layout/Footer";
import { SidebarProvider } from "./context/SidebarContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AccessibilityMenu from "./components/AccessibilityMenu";
import { useEffect, useState } from "react";

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ["/", "/register", "/forgot-password", "/verify-email", "/auth/callback"];
  const shouldHideNavbar =
    hideNavbarRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/backoffice") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/training/") ||
    location.pathname.startsWith("/my-activity");

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* Front Office Routes */}
        <Route path="/home" element={<Home />} />
        <Route path="/map" element={<WorldMap />} />
        <Route path="/training" element={<TrainingGrounds />} />
        <Route path="/training/:levelId" element={<TrainingLevel />} />
        <Route path="/arena" element={<BattleArena />} />
        <Route path="/dashboard" element={<CommanderDashboard />} />

        <Route path="/armory" element={<Armory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/castle" element={<UnityCastlePage />} />
        <Route path="/level/:id" element={<div>Challenge Page Coming Soon!</div>} />
        <Route path="/request-recruiter" element={<RequestRecruiterRole />} />
        <Route path="/programming-rooms" element={<ProgrammingRooms />} />
        <Route
          path="/create-room"
          element={
            <ProtectedRoute requiredRole={['recruiter', 'admin']}>
              <CreateProgrammingRoom />
            </ProtectedRoute>
          }
        />

        {/* Back Office & Activity Routes */}
        <Route path="/backoffice/dashboard" element={<Dashboard />} />
        <Route path="/backoffice/users" element={<UserTracker />} />
        <Route path="/backoffice/role-requests" element={<RoleRequests />} />
        <Route path="/admin/activity" element={<ActivityLogs />} />
        <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        <Route path="/my-activity" element={<MyActivity />} />
      </Routes>
      {!shouldHideNavbar && <Footer />}

      <AccessibilityMenu />

      <ReadingGuideLine />
    </>
  );
}

function ReadingGuideLine() {
  const { readingGuide } = useSettings();
  const [mousePos, setMousePos] = useState({ y: 0 });

  useEffect(() => {
    if (!readingGuide) return;

    const handleMouseMove = (e) => {
      setMousePos({ y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [readingGuide]);

  if (!readingGuide) return null;

  return (
    <div
      className="reading-guide"
      style={{
        transform: `translateY(${mousePos.y}px)`,
        top: 0
      }}
    />
  );
}

function App() {
  return (
    <SettingsProvider>
      <SidebarProvider>
        <AppContent />
      </SidebarProvider>
    </SettingsProvider>
  );
}

export default App;