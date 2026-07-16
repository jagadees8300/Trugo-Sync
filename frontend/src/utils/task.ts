import type { Task } from '../types';

/** Built-in + custom project stage keys. */
export type TaskStatus = string;

export const BUILTIN_STATUSES = ['TO_DO', 'IN_PROGRESS', 'DONE'] as const;

export const normalizeTaskStatus = (status: string): TaskStatus => {
  if (status === 'PENDING' || status === 'TO_DO') return 'TO_DO';
  if (status === 'COMPLETED' || status === 'DONE') return 'DONE';
  return status;
};

export const isTaskDone = (status: string) =>
  status === 'DONE' || status === 'COMPLETED';

export const isTaskOverdue = (task: Pick<Task, 'deadline' | 'status'>) => {
  if (!task.deadline || isTaskDone(task.status)) return false;
  const deadline = new Date(task.deadline);
  deadline.setHours(23, 59, 59, 999);
  return deadline < new Date();
};

export const getUserRole = (): string => {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return 'EMPLOYEE';
    const user = JSON.parse(stored);
    if (typeof user?.role === 'string') return user.role;
    return user?.role?.name ?? 'EMPLOYEE';
  } catch {
    return 'EMPLOYEE';
  }
};

export const isAdmin = () => getUserRole() === 'ADMIN';

export const isHr = () => {
  const role = getUserRole();
  return role === 'HR' || role === 'ADMIN';
};

export const canApproveLeave = () => {
  const role = getUserRole();
  return role === 'ADMIN' || role === 'HR';
};

export const usesAdminHome = (role?: string) => {
  const r = role ?? getUserRole();
  return (
    r === 'ADMIN' ||
    r === 'HR' ||
    r === 'PROJECT_MANAGER' ||
    r === 'TEAM_LEAD'
  );
};

/** Admin / PM / TL manage milestones; HR and EMPLOYEE do not. */
export const canManageMilestones = (role?: string) => {
  const r = role ?? getUserRole();
  return r === 'ADMIN' || r === 'PROJECT_MANAGER' || r === 'TEAM_LEAD';
};

export const getHomePathForRole = (role?: string) =>
  usesAdminHome(role) ? '/dashboard' : '/my-home';

export const getLeavePathForRole = (role?: string) => {
  const r = role ?? getUserRole();
  return r === 'ADMIN' || r === 'HR' ? '/leave' : '/my-leave';
};
export const getCurrentUserId = (): string | null => {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user?._id ?? user?.id ?? null;
  } catch {
    return null;
  }
};

const API_BASE = 'http://localhost:5000';
const DEFAULT_AVATAR = 'https://i.pravatar.cc/100?img=11';

export const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
    return avatarUrl;
  }
  return `${API_BASE}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
};

export const getStoredUserAvatar = (): string => {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return DEFAULT_AVATAR;
    const user = JSON.parse(stored);
    return resolveAvatarUrl(user?.avatarUrl);
  } catch {
    return DEFAULT_AVATAR;
  }
};
