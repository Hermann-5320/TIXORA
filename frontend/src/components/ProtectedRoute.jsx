import { Navigate, useLocation } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/connexion" state={{ from: location, needLogin: true }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
