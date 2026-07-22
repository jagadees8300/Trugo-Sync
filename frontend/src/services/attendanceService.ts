import api from './api';

export type AttendanceEntry = {
  _id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  note?: string;
  workMode?: 'OFFICE' | 'WFH';
  status?: 'WORKING' | 'PAUSED' | 'COMPLETED';
  activePauseReason?: string | null;
  hours?: number | null;
};

export type LocationCheckResult = {
  allowed: boolean;
  distanceMeters: number;
  radiusMeters: number;
  officeLat: number;
  officeLng: number;
  message: string;
};

export type OfficeGeoConfig = {
  lat: number;
  lng: number;
  radiusMeters: number;
};

export const attendanceApi = {
  getOfficeConfig: () => api.get<OfficeGeoConfig>('/attendance/office-config'),
  checkLocation: (latitude: number, longitude: number) =>
    api.post<LocationCheckResult>('/attendance/check-location', {
      latitude,
      longitude,
    }),
  clockIn: (latitude: number, longitude: number, note?: string) =>
    api.post<AttendanceEntry>('/attendance/clock-in', { latitude, longitude, note }),
  workFromHome: (note?: string) =>
    api.post<AttendanceEntry>('/attendance/work-from-home', note ? { note } : {}),
  pause: (reason?: string) =>
    api.post<AttendanceEntry>('/attendance/pause', reason ? { reason } : {}),
  resume: () => api.post<AttendanceEntry>('/attendance/resume'),
  clockOut: () => api.post<AttendanceEntry>('/attendance/clock-out'),
  getToday: () => api.get<AttendanceEntry | null>('/attendance/me/today'),
  getMine: (from?: string, to?: string) =>
    api.get<AttendanceEntry[]>('/attendance/me', { params: { from, to } }),
  getByDate: (date: string) => api.get(`/attendance/date`, { params: { date } }),
};

export default attendanceApi;
