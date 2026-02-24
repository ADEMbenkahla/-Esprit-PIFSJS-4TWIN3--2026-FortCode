import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import UserTracker from "./pages/backOffice/UserTracker";
import ActivityLogs from "./pages/backOffice/ActivityLogs";
import ActivityDetail from "./pages/backOffice/ActivityDetail";
import MyActivity from "./pages/MyActivity";

// Front Office Imports
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { Home } from "./pages/frontOffice/pages/Home";
import WorldMap from "./pages/frontOffice/pages/WorldMap";
import TrainingGrounds from "./pages/frontOffice/pages/TrainingGrounds";
import BattleArena from "./pages/frontOffice/pages/BattleArena";
import CommanderDashboard from "./pages/frontOffice/pages/CommanderDashboard";
import Armory from "./pages/frontOffice/pages/Armory";
import { UnityCastlePage } from "./pages/frontOffice/pages/UnityCastlePage";
import { Navbar } from "./pages/frontOffice/components/layout/Navbar";

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ["/", "/register", "/forgot-password", "/auth/callback"];
  const shouldHideNavbar =
    hideNavbarRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/backoffice") ||
    location.pathname.startsWith("/admin");

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* Front Office Routes */}
        <Route path="/home" element={<Home />} />
        <Route path="/map" element={<WorldMap />} />
        <Route path="/training" element={<TrainingGrounds />} />
        <Route path="/arena" element={<BattleArena />} />
        <Route path="/dashboard" element={<CommanderDashboard />} />
        <Route path="/armory" element={<Armory />} />
        <Route path="/castle" element={<UnityCastlePage />} />
        <Route path="/level/:id" element={<div>Challenge Page Coming Soon!</div>} />

        {/* Back Office & Activity Routes */}
        <Route path="/backoffice/users" element={<UserTracker />} />
        <Route path="/admin/activity" element={<ActivityLogs />} />
        <Route path="/admin/activity/:id" element={<ActivityDetail />} />
        <Route path="/my-activity" element={<MyActivity />} />
      </Routes>
    </>
  );
}

import { SidebarProvider } from "./context/SidebarContext";

function App() {
  return (
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  );
}

export default App;
