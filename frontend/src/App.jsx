import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import "./App.css";
import { AdminOnlyRoute, FrontOfficeOnlyRoute } from "./guards/RouteGuards";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const BattleInvite = lazy(() => import("./pages/BattleInvite"));
const BattleProgrammer = lazy(() => import("./pages/frontOffice/pages/BattleProgrammer"));
const UserTracker = lazy(() => import("./pages/backOffice/UserTracker"));
const Dashboard = lazy(() => import("./pages/backOffice/Dashboard"));
const ActivityLogs = lazy(() => import("./pages/backOffice/ActivityLogs"));
const ActivityDetail = lazy(() => import("./pages/backOffice/ActivityDetail"));
const RoleRequests = lazy(() => import("./pages/backOffice/RoleRequests"));
const BackOfficeSettings = lazy(() => import("./pages/backOffice/Settings"));
const BackOfficeChallenges = lazy(() => import("./pages/backOffice/Challenges"));
const AdminStages = lazy(() => import("./pages/backOffice/AdminStages"));
const MyActivity = lazy(() => import("./pages/MyActivity"));
const VirtualRooms = lazy(() => import("./pages/backOffice/VirtualRooms"));

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Home = lazy(() => import("./pages/frontOffice/pages/Home").then(m => ({ default: m.Home })));
const WorldMap3D = lazy(() => import("./pages/frontOffice/pages/WorldMap3D"));
const TrainingGrounds = lazy(() => import("./pages/frontOffice/pages/TrainingGrounds"));
const StageDetail = lazy(() => import("./pages/frontOffice/pages/StageDetail"));
const ChallengeEditor = lazy(() => import("./pages/frontOffice/pages/ChallengeEditor"));
const DuelLobby = lazy(() => import("./pages/frontOffice/pages/DuelArena/DuelLobby"));
const LiveBattle = lazy(() => import("./pages/frontOffice/pages/DuelArena/LiveBattle"));
const UserDashboard = lazy(() => import("./pages/frontOffice/pages/CommanderDashboard"));
const Armory = lazy(() => import("./pages/frontOffice/pages/Armory"));
const Settings = lazy(() => import("./pages/frontOffice/pages/Settings"));
const UnityCastlePage = lazy(() => import("./pages/frontOffice/pages/UnityCastlePage").then(m => ({ default: m.UnityCastlePage })));
const VirtualRoom = lazy(() => import("./pages/frontOffice/pages/VirtualRoom"));
const RequestRecruiterRole = lazy(() => import("./pages/frontOffice/pages/RequestRecruiterRole"));
const TrainingLevel = lazy(() => import("./pages/frontOffice/pages/TrainingLevel").then(m => ({ default: m.TrainingLevel })));

const Navbar = lazy(() => import("./pages/frontOffice/components/layout/Navbar").then(m => ({ default: m.Navbar })));
const Footer = lazy(() => import("./pages/frontOffice/components/layout/Footer").then(m => ({ default: m.Footer })));
const AccessibilityMenu = lazy(() => import("./components/AccessibilityMenu"));

import { SidebarProvider } from "./context/SidebarContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-950">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

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
    location.pathname.startsWith("/virtual-room") ||
    location.pathname.startsWith("/battle-invite") ||
    location.pathname.startsWith("/visitor/battle-invite") ||
    location.pathname.startsWith("/room-invitation") ||
    location.pathname.startsWith("/programmer/");

  return (
    <>
      <Suspense fallback={null}>
        {!shouldHideNavbar && <Navbar />}
      </Suspense>

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/battle-invite" element={<BattleInvite />} />
          <Route path="/visitor/battle-invite" element={<BattleInvite />} />
          <Route path="/room-invitation" element={<BattleInvite />} />
          <Route
            path="/programmer/:roomId"
            element={
              <ProtectedRoute requiredRole={["participant"]}>
                <BattleProgrammer />
              </ProtectedRoute>
            }
          />

          {/* Front Office Routes */}
          <Route path="/home" element={<FrontOfficeOnlyRoute><Home /></FrontOfficeOnlyRoute>} />
          <Route path="/map" element={<FrontOfficeOnlyRoute><WorldMap3D /></FrontOfficeOnlyRoute>} />
          <Route path="/training" element={<FrontOfficeOnlyRoute><TrainingGrounds /></FrontOfficeOnlyRoute>} />
          <Route path="/training/:stageId/challenge/:challengeId" element={<FrontOfficeOnlyRoute><TrainingLevel /></FrontOfficeOnlyRoute>} />
          <Route path="/training/:stageId" element={<FrontOfficeOnlyRoute><StageDetail /></FrontOfficeOnlyRoute>} />
          <Route path="/stages/:stageId" element={<FrontOfficeOnlyRoute><LegacyStagesRedirect /></FrontOfficeOnlyRoute>} />
          <Route path="/arena" element={<FrontOfficeOnlyRoute><DuelLobby /></FrontOfficeOnlyRoute>} />
          <Route path="/arena/battle/:matchId" element={<FrontOfficeOnlyRoute><LiveBattle /></FrontOfficeOnlyRoute>} />
          <Route path="/dashboard" element={<FrontOfficeOnlyRoute><UserDashboard /></FrontOfficeOnlyRoute>} />
          <Route path="/armory" element={<FrontOfficeOnlyRoute><Armory /></FrontOfficeOnlyRoute>} />
          <Route path="/settings" element={<FrontOfficeOnlyRoute><Settings /></FrontOfficeOnlyRoute>} />
          <Route path="/castle" element={<FrontOfficeOnlyRoute><UnityCastlePage /></FrontOfficeOnlyRoute>} />
          <Route path="/virtual-room/:roomSlug" element={<FrontOfficeOnlyRoute><VirtualRoom /></FrontOfficeOnlyRoute>} />
          <Route path="/level/:id" element={<FrontOfficeOnlyRoute><div>Challenge Page Coming Soon!</div></FrontOfficeOnlyRoute>} />
          <Route path="/request-recruiter" element={<FrontOfficeOnlyRoute><RequestRecruiterRole /></FrontOfficeOnlyRoute>} />

          {/* Back Office & Admin */}
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
      </Suspense>

      <Suspense fallback={null}>
        {!shouldHideNavbar && <Footer />}
      </Suspense>

      <Suspense fallback={null}>
        <AccessibilityMenu />
      </Suspense>

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