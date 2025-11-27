import type { ReactNode } from "react";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;

