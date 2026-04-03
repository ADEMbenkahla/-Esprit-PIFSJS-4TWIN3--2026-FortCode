import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import { AdminOnlyRoute, FrontOfficeOnlyRoute } from "./guards/RouteGuards";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import UserTracker from "./pages/backOffice/UserTracker";
import Dashboard from "./pages/backOffice/Dashboard";
import ActivityLogs from "./pages/backOffice/ActivityLogs";
import ActivityDetail from "./pages/backOffice/ActivityDetail";
import RoleRequests from "./pages/backOffice/RoleRequests";
import BackOfficeSettings from "./pages/backOffice/Settings";
import BackOfficeChallenges from "./pages/backOffice/Challenges";
import MyActivity from "./pages/MyActivity";
import VirtualRooms from "./pages/backOffice/VirtualRooms";

// Front Office Imports
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { Home } from "./pages/frontOffice/pages/Home";
import WorldMap from "./pages/frontOffice/pages/WorldMap";
import TrainingGrounds from "./pages/frontOffice/pages/TrainingGrounds";
import { TrainingLevel } from "./pages/frontOffice/pages/TrainingLevel";
import DuelLobby from "./pages/frontOffice/pages/DuelArena/DuelLobby";
import LiveBattle from "./pages/frontOffice/pages/DuelArena/LiveBattle";
import CommanderDashboard from "./pages/frontOffice/pages/CommanderDashboard";
import Armory from "./pages/frontOffice/pages/Armory";
import Settings from "./pages/frontOffice/pages/Settings";
import { UnityCastlePage } from "./pages/frontOffice/pages/UnityCastlePage";
<<<<<<< HEAD
import VirtualRoom from "./pages/frontOffice/pages/VirtualRoom";
=======
import RequestRecruiterRole from "./pages/frontOffice/pages/RequestRecruiterRole";
import CreateProgrammingRoom from "./pages/frontOffice/pages/CreateProgrammingRoom";
import ProgrammingRooms from "./pages/frontOffice/pages/ProgrammingRooms";
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
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
<<<<<<< HEAD
    location.pathname.startsWith("/training/")||
    location.pathname.startsWith("/my-activity") ||
    location.pathname.startsWith("/virtual-room");
=======
    location.pathname.startsWith("/training/") ||
    location.pathname.startsWith("/stages/") ||
    location.pathname.startsWith("/my-activity");
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968

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

<<<<<<< HEAD
        {/* Front Office Routes — only participants & recruiters; admin is redirected to back office */}
        <Route path="/home" element={<FrontOfficeOnlyRoute><Home /></FrontOfficeOnlyRoute>} />
        <Route path="/map" element={<FrontOfficeOnlyRoute><WorldMap /></FrontOfficeOnlyRoute>} />
        <Route path="/training" element={<FrontOfficeOnlyRoute><TrainingGrounds /></FrontOfficeOnlyRoute>} />
        <Route path="/training/:levelId" element={<FrontOfficeOnlyRoute><TrainingLevel /></FrontOfficeOnlyRoute>} />
        <Route path="/arena" element={<FrontOfficeOnlyRoute><BattleArena /></FrontOfficeOnlyRoute>} />
        <Route path="/dashboard" element={<FrontOfficeOnlyRoute><CommanderDashboard /></FrontOfficeOnlyRoute>} />
        <Route path="/armory" element={<FrontOfficeOnlyRoute><Armory /></FrontOfficeOnlyRoute>} />
        <Route path="/settings" element={<FrontOfficeOnlyRoute><Settings /></FrontOfficeOnlyRoute>} />
        <Route path="/castle" element={<FrontOfficeOnlyRoute><UnityCastlePage /></FrontOfficeOnlyRoute>} />
        <Route path="/virtual-room/:roomSlug" element={<FrontOfficeOnlyRoute><VirtualRoom /></FrontOfficeOnlyRoute>} />
        <Route path="/level/:id" element={<FrontOfficeOnlyRoute><div>Challenge Page Coming Soon!</div></FrontOfficeOnlyRoute>} />

        {/* Back Office & Admin — only admin; participants/recruiters redirected to /home */}
        <Route path="/backoffice/dashboard" element={<AdminOnlyRoute><Dashboard /></AdminOnlyRoute>} />
        <Route path="/backoffice/users" element={<AdminOnlyRoute><UserTracker /></AdminOnlyRoute>} />
        <Route path="/backoffice/virtual-rooms" element={<AdminOnlyRoute><VirtualRooms /></AdminOnlyRoute>} />
        <Route path="/admin/activity" element={<AdminOnlyRoute><ActivityLogs /></AdminOnlyRoute>} />
        <Route path="/admin/activity/:id" element={<AdminOnlyRoute><ActivityDetail /></AdminOnlyRoute>} />
=======
        {/* Front Office Routes */}
        <Route path="/home" element={<Home />} />
        <Route path="/map" element={<WorldMap />} />
        <Route path="/training" element={<TrainingGrounds />} />
        <Route path="/training/:levelId" element={<TrainingLevel />} />
        <Route path="/stages/:levelId" element={<TrainingLevel />} />
        <Route path="/arena" element={<DuelLobby />} />
        <Route path="/arena/battle/:matchId" element={<LiveBattle />} />
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
        <Route path="/backoffice/settings" element={<BackOfficeSettings />} />
        <Route path="/backoffice/challenges" element={<BackOfficeChallenges />} />
        <Route path="/admin/activity" element={<ActivityLogs />} />
        <Route path="/admin/activity/:id" element={<ActivityDetail />} />
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
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