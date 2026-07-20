import type {
  LeaveDashboard,
  LeaveOnDate,
  LeaveRequest,
  EmployeeLeaveHistory,
  MyLeaveSummary,
  DailyLeaveAttendance,
  LeaveBalance,
  Holiday,
} from '../types';
import api from './api';

export const leaveApi = {
  getAll: () => api.get<LeaveRequest[]>('/leaves'),
  getPending: () => api.get<LeaveRequest[]>('/leaves/pending'),
  getDashboard: () => api.get<LeaveDashboard>('/leaves/dashboard'),
  getByDate: (date: string) => api.get<LeaveOnDate[]>(`/leaves/date/${date}`),
  getAttendanceByDate: (date: string) =>
    api.get<DailyLeaveAttendance>(`/leaves/attendance/${date}`),
  getEmployeeHistory: (employeeId: string) =>
    api.get<EmployeeLeaveHistory>(`/leaves/employee/${employeeId}`),
  getMine: () => api.get<LeaveRequest[]>('/leaves/me'),
  getMySummary: () => api.get<MyLeaveSummary>('/leaves/me/summary'),
  getMyCalendar: () => api.get<string[]>('/leaves/me/calendar'),
  getMyBalances: (year?: number) =>
    api.get<LeaveBalance[]>('/leaves/balances/me', {
      params: year ? { year } : undefined,
    }),
  getUserBalances: (userId: string, year?: number) =>
    api.get<LeaveBalance[]>(`/leaves/balances/${userId}`, {
      params: year ? { year } : undefined,
    }),
  updateBalance: (
    userId: string,
    data: { leaveType: string; allocated: number },
    year?: number,
  ) =>
    api.patch<LeaveBalance>(`/leaves/balances/${userId}`, data, {
      params: year ? { year } : undefined,
    }),
  getHolidays: (year?: number) =>
    api.get<Holiday[]>('/leaves/holidays', {
      params: year ? { year } : undefined,
    }),
  createHoliday: (data: { name: string; date: string; optional?: boolean }) =>
    api.post<Holiday>('/leaves/holidays', data),
  deleteHoliday: (id: string) =>
    api.delete<{ message: string }>(`/leaves/holidays/${id}`),
  create: (data: {
    employeeId: string;
    fromDate: string;
    toDate: string;
    totalDays?: number;
    leaveType: string;
    isHalfDay?: boolean;
    halfDaySession?: 'AM' | 'PM';
  }) => api.post<{ message: string }>('/leaves', data),
  approve: (id: string, reason?: string) =>
    api.patch<{ message: string }>(`/leaves/${id}/approve`, { reason }),
  reject: (id: string, reason?: string) =>
    api.patch<{ message: string }>(`/leaves/${id}/reject`, { reason }),
};

export default leaveApi;
