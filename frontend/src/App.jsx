import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import UserTracker from "./pages/backOffice/UserTracker";
import ActivityLogs from "./pages/backOffice/ActivityLogs";
import ActivityDetail from "./pages/backOffice/ActivityDetail";
import MyActivity from "./pages/MyActivity";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/backoffice/users" element={<UserTracker />} />
      <Route path="/admin/activity" element={<ActivityLogs />} />
      <Route path="/admin/activity/:id" element={<ActivityDetail />} />
      <Route path="/my-activity" element={<MyActivity />} />
    </Routes>
  );
}

export default App;
