import { Navigate } from "react-router-dom";

// Deprecated: the standalone control screen was merged into the dashboard's
// AttentionPanel. Route now redirects to the admin dashboard.
export default function AdminControl() {
  return <Navigate to="/admin" replace />;
}
