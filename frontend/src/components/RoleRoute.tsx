import { Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { getHomePathForRole, getUserRole } from '../utils/task';
import type { AppRole } from '../types';

interface RoleRouteProps {
  roles: AppRole[];
  children: React.ReactNode;
}

export function RoleRoute({ roles, children }: RoleRouteProps) {
  const role = getUserRole() as AppRole;
  const home = getHomePathForRole(role);

  // Prevent blank-page redirect loops (e.g. CLIENT -> /my-home -> CLIENT again).
  if (!roles.includes(role)) {
    if (typeof window !== 'undefined' && window.location.pathname === home) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={home} replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
