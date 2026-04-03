import React from "react";
import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
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
import AdminStages from "./pages/backOffice/AdminStages";
import MyActivity from "./pages/MyActivity";
import VirtualRooms from "./pages/backOffice/VirtualRooms";

// Front Office Imports
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { Home } from "./pages/frontOffice/pages/Home";
import WorldMap from "./pages/frontOffice/pages/WorldMap";
import TrainingGrounds from "./pages/frontOffice/pages/TrainingGrounds";
import StageDetail from "./pages/frontOffice/pages/StageDetail";
import ChallengeEditor from "./pages/frontOffice/pages/ChallengeEditor";
import DuelLobby from "./pages/frontOffice/pages/DuelArena/DuelLobby";
import LiveBattle from "./pages/frontOffice/pages/DuelArena/LiveBattle";
import CommanderDashboard from "./pages/frontOffice/pages/CommanderDashboard";
import Armory from "./pages/frontOffice/pages/Armory";
import Settings from "./pages/frontOffice/pages/Settings";
import { UnityCastlePage } from "./pages/frontOffice/pages/UnityCastlePage";
import VirtualRoom from "./pages/frontOffice/pages/VirtualRoom";
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

function LegacyStagesRedirect() {
  const { stageId } = useParams();
  return <Navigate to={`/training/${stageId}`} replace />;
}

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ["/", "/register", "/forgot-password", "/verify-email", "/auth/callback"];
  const shouldHideNavbar =
    hideNavbarRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/backoffice") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/training/") ||
    location.pathname.startsWith("/stages/") ||
    location.pathname.startsWith("/my-activity") ||
    location.pathname.startsWith("/virtual-room");

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

        {/* Front Office Routes — only participants & recruiters; admin is redirected to back office */}
        <Route path="/home" element={<FrontOfficeOnlyRoute><Home /></FrontOfficeOnlyRoute>} />
        <Route path="/map" element={<FrontOfficeOnlyRoute><WorldMap /></FrontOfficeOnlyRoute>} />
        <Route path="/training" element={<FrontOfficeOnlyRoute><TrainingGrounds /></FrontOfficeOnlyRoute>} />
        <Route path="/training/:stageId/challenge/:challengeId" element={<FrontOfficeOnlyRoute><ChallengeEditor /></FrontOfficeOnlyRoute>} />
        <Route path="/training/:stageId" element={<FrontOfficeOnlyRoute><StageDetail /></FrontOfficeOnlyRoute>} />
        <Route path="/stages/:stageId" element={<FrontOfficeOnlyRoute><LegacyStagesRedirect /></FrontOfficeOnlyRoute>} />
        <Route path="/arena" element={<FrontOfficeOnlyRoute><DuelLobby /></FrontOfficeOnlyRoute>} />
        <Route path="/arena/battle/:matchId" element={<FrontOfficeOnlyRoute><LiveBattle /></FrontOfficeOnlyRoute>} />
        <Route path="/dashboard" element={<FrontOfficeOnlyRoute><CommanderDashboard /></FrontOfficeOnlyRoute>} />
        <Route path="/armory" element={<FrontOfficeOnlyRoute><Armory /></FrontOfficeOnlyRoute>} />
        <Route path="/settings" element={<FrontOfficeOnlyRoute><Settings /></FrontOfficeOnlyRoute>} />
        <Route path="/castle" element={<FrontOfficeOnlyRoute><UnityCastlePage /></FrontOfficeOnlyRoute>} />
        <Route path="/virtual-room/:roomSlug" element={<FrontOfficeOnlyRoute><VirtualRoom /></FrontOfficeOnlyRoute>} />
        <Route path="/level/:id" element={<FrontOfficeOnlyRoute><div>Challenge Page Coming Soon!</div></FrontOfficeOnlyRoute>} />
        <Route path="/request-recruiter" element={<FrontOfficeOnlyRoute><RequestRecruiterRole /></FrontOfficeOnlyRoute>} />
        <Route path="/programming-rooms" element={<FrontOfficeOnlyRoute><ProgrammingRooms /></FrontOfficeOnlyRoute>} />
        <Route
          path="/create-room"
          element={
            <ProtectedRoute requiredRole={["recruiter", "admin"]}>
              <CreateProgrammingRoom />
            </ProtectedRoute>
          }
        />

        {/* Back Office & Admin — only admin; participants/recruiters redirected to /home */}
        <Route path="/backoffice/dashboard" element={<AdminOnlyRoute><Dashboard /></AdminOnlyRoute>} />
        <Route path="/backoffice/users" element={<AdminOnlyRoute><UserTracker /></AdminOnlyRoute>} />
        <Route path="/backoffice/virtual-rooms" element={<AdminOnlyRoute><VirtualRooms /></AdminOnlyRoute>} />
        <Route path="/backoffice/role-requests" element={<AdminOnlyRoute><RoleRequests /></AdminOnlyRoute>} />
        <Route path="/backoffice/settings" element={<AdminOnlyRoute><BackOfficeSettings /></AdminOnlyRoute>} />
        <Route path="/backoffice/challenges" element={<AdminOnlyRoute><BackOfficeChallenges /></AdminOnlyRoute>} />
        <Route path="/backoffice/stages" element={<AdminOnlyRoute><AdminStages /></AdminOnlyRoute>} />
        <Route path="/admin/activity" element={<AdminOnlyRoute><ActivityLogs /></AdminOnlyRoute>} />
        <Route path="/admin/activity/:id" element={<AdminOnlyRoute><ActivityDetail /></AdminOnlyRoute>} />
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