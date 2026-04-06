import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Get current user role from JWT (same token source order as axios: sessionStorage, then localStorage).
 * Returns "admin" | "recruiter" | "participant" | null if no/invalid token.
 */
export function getUserRole() {
  try {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    const r = payload.role;
    return r != null ? String(r).toLowerCase().trim() : null;
  } catch {
    return null;
  }
}

/**
 * Only admins can access. Participants and recruiters are redirected to /home.
 * No token -> redirect to login (/).
 */
export function AdminOnlyRoute({ children }) {
  const location = useLocation();
  const role = getUserRole();

  if (!role) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (role !== "admin") {
    return <Navigate to="/home" state={{ from: location }} replace />;
  }
  return children;
}

/**
 * Only participants and recruiters. Admin is redirected to back office.
 * No token -> redirect to login (/).
 */
export function FrontOfficeOnlyRoute({ children }) {
  const location = useLocation();
  const role = getUserRole();

  if (!role) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (role === "admin") {
    return <Navigate to="/backoffice/dashboard" state={{ from: location }} replace />;
  }
  return children;
}
