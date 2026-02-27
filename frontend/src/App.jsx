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
import MyActivity from "./pages/MyActivity";
import VirtualRooms from "./pages/backOffice/VirtualRooms";

// Front Office Imports
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { Home } from "./pages/frontOffice/pages/Home";
import WorldMap from "./pages/frontOffice/pages/WorldMap";
import TrainingGrounds from "./pages/frontOffice/pages/TrainingGrounds";
import { TrainingLevel } from "./pages/frontOffice/pages/TrainingLevel";
import BattleArena from "./pages/frontOffice/pages/BattleArena";
import CommanderDashboard from "./pages/frontOffice/pages/CommanderDashboard";
import Armory from "./pages/frontOffice/pages/Armory";
import Settings from "./pages/frontOffice/pages/Settings";
import { UnityCastlePage } from "./pages/frontOffice/pages/UnityCastlePage";
import VirtualRoom from "./pages/frontOffice/pages/VirtualRoom";
import { Navbar } from "./pages/frontOffice/components/layout/Navbar";
import { Footer } from "./pages/frontOffice/components/layout/Footer";
import { SidebarProvider } from "./context/SidebarContext";
import { SettingsProvider } from "./context/SettingsContext";

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ["/", "/register", "/forgot-password", "/auth/callback"];
  const shouldHideNavbar =
    hideNavbarRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/backoffice") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/training/")||
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
        <Route path="/auth/callback" element={<OAuthCallback />} />

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
        <Route path="/my-activity" element={<MyActivity />} />
      </Routes>
      {!shouldHideNavbar && <Footer />}
    </>
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