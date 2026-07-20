export type AppRole =
  | 'ADMIN'
  | 'HR'
  | 'PROJECT_MANAGER'
  | 'TEAM_LEAD'
  | 'EMPLOYEE'
  | 'CLIENT';

export const ALL_APP_ROLES: AppRole[] = [
  'ADMIN',
  'HR',
  'PROJECT_MANAGER',
  'TEAM_LEAD',
  'EMPLOYEE',
  'CLIENT',
];

export type AuthUser = {
  userId: string;
  email: string;
  role: AppRole;
};

export function normalizeRole(role: unknown): AppRole {
  if (typeof role === 'string' && ALL_APP_ROLES.includes(role as AppRole)) {
    return role as AppRole;
  }
  if (role && typeof role === 'object' && 'name' in role) {
    const name = String((role as { name: string }).name);
    if (ALL_APP_ROLES.includes(name as AppRole)) return name as AppRole;
  }
  return 'EMPLOYEE';
}

export function isAdmin(user?: AuthUser | { role?: string }) {
  return user?.role === 'ADMIN';
}

export function isHr(user?: AuthUser | { role?: string }) {
  return user?.role === 'HR' || user?.role === 'ADMIN';
}

export function canApproveLeave(user?: AuthUser | { role?: string }) {
  return user?.role === 'ADMIN' || user?.role === 'HR';
}

export function canManageUsers(user?: AuthUser | { role?: string }) {
  return user?.role === 'ADMIN';
}

export function canManageProject(
  user?: AuthUser | { role?: string },
  opts?: { isCreator?: boolean; isTeamMember?: boolean },
) {
  if (!user?.role) return false;
  if (user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER') return true;
  if (user.role === 'TEAM_LEAD' && (opts?.isCreator || opts?.isTeamMember)) return true;
  return false;
}

export function canDeleteTask(user?: AuthUser | { role?: string }) {
  return (
    user?.role === 'ADMIN' ||
    user?.role === 'PROJECT_MANAGER' ||
    user?.role === 'TEAM_LEAD'
  );
}

export function isElevated(user?: AuthUser | { role?: string }) {
  return (
    user?.role === 'ADMIN' ||
    user?.role === 'HR' ||
    user?.role === 'PROJECT_MANAGER' ||
    user?.role === 'TEAM_LEAD'
  );
}

/** Staff roles that use admin-style dashboard home */
export function usesAdminHome(user?: AuthUser | { role?: string }) {
  return (
    user?.role === 'ADMIN' ||
    user?.role === 'HR' ||
    user?.role === 'PROJECT_MANAGER' ||
    user?.role === 'TEAM_LEAD'
  );
}

export function usesAdminLeave(user?: AuthUser | { role?: string }) {
  return canApproveLeave(user);
}

export function isClient(user?: AuthUser | { role?: string }) {
  return user?.role === 'CLIENT';
}
