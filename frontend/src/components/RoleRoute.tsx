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

  if (!roles.includes(role)) {
    return <Navigate to={getHomePathForRole(role)} replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
