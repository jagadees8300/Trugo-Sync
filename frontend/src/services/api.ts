import axios from 'axios';
import type {
  Task,
  User,
  Project,
  DashboardStats,
  TeamMemberStatus,
  ProjectProgress,
  ProjectDetail,
  ProjectDeadline,
  ProjectDocumentFile,
  Notification,
  Milestone,
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: User }>('/auth/login', { email, password }),
  getMe: () => api.get<User>('/auth/me'),
  updateProfile: (data: { name?: string; designation?: string; avatar?: File | null }) => {
    const form = new FormData();
    if (data.name !== undefined) form.append('name', data.name);
    if (data.designation !== undefined) form.append('designation', data.designation);
    if (data.avatar) form.append('avatar', data.avatar);
    return api.patch<User>('/auth/me', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  forgotPassword: (email: string) =>
    api.post<{ message: string; emailSent?: boolean }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getAssignees: () => api.get<User[]>('/users/assignees'),
  create: (data: {
    name: string;
    email: string;
    password: string;
    designation?: string;
    role?: string;
  }) => api.post<{ message: string; user: User }>('/users', data),
};

export const projectsApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getById: (id: string) => api.get<Project & { tasks?: Task[] }>(`/projects/${id}`),
  getDetail: (id: string) =>
    api.get<ProjectDetail & { tasks?: Task[] }>(`/projects/${id}/detail`),
  create: (data: {
    name: string;
    clientName?: string;
    description?: string;
    teamMembers?: string[];
    startDate?: string;
    deadline?: string;
    categories: string[];
  }) => api.post<Project>('/projects', data),
  addStage: (projectId: string, data: { name: string; color?: string }) =>
    api.post<Project>(`/projects/${projectId}/stages`, data),
  listMilestones: (projectId: string) =>
    api.get<Milestone[]>(`/projects/${projectId}/milestones`),
  createMilestone: (
    projectId: string,
    data: {
      title: string;
      dueDate?: string;
      status?: string;
      assigneeIds: string[];
    },
  ) => api.post<Milestone>(`/projects/${projectId}/milestones`, data),
  deleteMilestone: (projectId: string, milestoneId: string) =>
    api.delete(`/projects/${projectId}/milestones/${milestoneId}`),
  listDocuments: (projectId: string) =>
    api.get<ProjectDocumentFile[]>(`/projects/${projectId}/documents`),
  uploadDocument: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ProjectDocumentFile>(`/projects/${projectId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  fetchDocumentBlob: (projectId: string, docId: string, disposition: 'inline' | 'attachment' = 'attachment') =>
    api.get<Blob>(`/projects/${projectId}/documents/${docId}`, {
      params: { disposition },
      responseType: 'blob',
    }),
  deleteDocument: (projectId: string, docId: string) =>
    api.delete(`/projects/${projectId}/documents/${docId}`),
};

export const tasksApi = {
  getAll: (params?: {
    status?: string;
    assignedTo?: string;
    project?: string;
    projectId?: string;
    search?: string;
  }) => api.get<Task[]>('/tasks', { params }),
  getByUser: (userId: string, status?: string) =>
    api.get<Task[]>(`/tasks/user/${userId}`, { params: status ? { status } : undefined }),
  getById: (id: string) => api.get<Task>(`/tasks/${id}`),
  getSubtasks: (id: string) => api.get<Task[]>(`/tasks/${id}/subtasks`),
  create: (data: {
    title: string;
    description?: string;
    assignedTo: string;
    projectId?: string;
    project?: string;
    priority?: string;
    deadline?: string;
    parentTaskId?: string;
    dependsOn?: string[];
    milestoneId?: string;
  }) => api.post<Task>('/tasks', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Task>(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch<Task>(`/tasks/${id}/status`, { status }),
  addComment: (id: string, text: string) =>
    api.post<Task>(`/tasks/${id}/comments`, { text }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const notificationsApi = {
  getMine: () => api.get<Notification[]>('/notifications/me'),
  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/me/unread-count'),
  getUnread: (userId: string) =>
    api.get<Notification[]>(`/notifications/${userId}`),
  markRead: (id: string) => api.patch<Notification>(`/notifications/${id}/read`),
};

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getMyStats: () => api.get<DashboardStats>('/dashboard/my-stats'),
  getTeamStatus: () => api.get<TeamMemberStatus[]>('/dashboard/team-status'),
  getProjectProgress: () => api.get<ProjectProgress[]>('/dashboard/project-progress'),
  getProjectDetail: (projectId: string) =>
    api.get<ProjectDetail>(`/dashboard/projects/${projectId}`),
  getDeadlines: () => api.get<ProjectDeadline[]>('/dashboard/deadlines'),
};

export { leaveApi } from './leaveService';
export type {
  LeaveRequest,
  LeaveDashboard,
  LeaveOnDate,
  LeaveHistoryItem,
  EmployeeLeaveHistory,
} from '../types';

export default api;
