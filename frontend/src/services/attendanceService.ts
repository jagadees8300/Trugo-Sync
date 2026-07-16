import { useEffect, useState } from 'react';
import api from './api';

export type AttendanceEntry = {
  _id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  note?: string;
  hours?: number | null;
};

export const attendanceApi = {
  clockIn: (note?: string) =>
    api.post<AttendanceEntry>('/attendance/clock-in', { note }),
  clockOut: () => api.post<AttendanceEntry>('/attendance/clock-out'),
  getToday: () => api.get<AttendanceEntry | null>('/attendance/me/today'),
  getMine: (from?: string, to?: string) =>
    api.get<AttendanceEntry[]>('/attendance/me', { params: { from, to } }),
  getByDate: (date: string) => api.get(`/attendance/date`, { params: { date } }),
};

export default attendanceApi;
