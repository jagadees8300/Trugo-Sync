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

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_LEAD: 'Team Lead',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client',
};

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role?: AppRole | { name: string };
  designation?: string;
  avatarUrl?: string;
}

export interface ProjectStage {
  key: string;
  label: string;
  color: string;
  order: number;
}

export interface Project {
  _id: string;
  name: string;
  clientName?: string;
  clientUserId?: string | User;
  description?: string;
  categories?: string[];
  deadline?: string;
  startDate?: string;
  teamMembers?: User[];
  stages?: ProjectStage[];
  progress?: number;
  totalTasks?: number;
  doneTasks?: number;
  activeTasks?: number;
  completionPercent?: number;
}

export interface TaskComment {
  text: string;
  user: User;
  author?: User;
  createdAt: string;
}

export interface TaskHistoryEntry {
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  changedBy?: User;
  changedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  /** Built-in: TO_DO | IN_PROGRESS | DONE, or a custom stage key (QC, TESTING, …). */
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline?: string;
  project?: Project;
  projectId?: string;
  assignedTo?: User;
  createdBy?: User;
  /** True when a CLIENT created this task (drives red card styling). */
  fromClient?: boolean;
  comments?: TaskComment[];
  history?: TaskHistoryEntry[];
  parentTaskId?: string | { _id: string; title: string; status: string };
  dependsOn?: Array<string | { _id: string; title: string; status: string }>;
  milestoneId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  _id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  assignees?: Array<string | { _id: string; name?: string; email?: string }>;
}

export interface Notification {
  _id: string;
  userId: string;
  message: string;
  readStatus: boolean;
  type: 'TASK_ASSIGNED' | 'OVERDUE' | 'COMMENT_ADDED' | 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'DOCUMENT_UPLOADED';
  createdAt: string;
  senderId?: string | null;
  sender?: { _id: string; name: string; email?: string } | null;
  targetUserId?: string | null;
  targetUser?: { _id: string; name: string; email?: string } | null;
}

export interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  highPriority?: number;
  stageCounts?: Record<string, number>;
}

export interface TeamMemberStatus {
  userId: string;
  name: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionPercent: number;
}

export interface ProjectProgress {
  projectId: string;
  name: string;
  total: number;
  done: number;
  open: number;
  active: number;
  completionPercent: number;
}

export interface ProjectAssigneeStatus {
  userId: string;
  name: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
}

export interface ProjectDetail {
  project: Project & { stages?: ProjectStage[] };
  stats: DashboardStats & { completionPercent: number };
  assignees: ProjectAssigneeStatus[];
  milestones?: Milestone[];
  tasks?: Task[];
}

export interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  leaveType?: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';
  isHalfDay?: boolean;
  halfDaySession?: 'AM' | 'PM';
  status: 'Pending' | 'Approved' | 'Rejected';
  decisionReason?: string;
  decidedAt?: string;
  createdAt?: string;
}

export interface LeaveBalance {
  _id: string;
  userId: string;
  year: number;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';
  allocated: number;
  used: number;
  remaining: number;
}

export interface Holiday {
  _id: string;
  name: string;
  date: string;
  optional?: boolean;
}

export interface LeaveDashboard {
  present: number;
  absent: number;
  onLeave: number;
  pending: number;
}

export interface MyLeaveSummary {
  totalLeaveDays: number;
  pendingCount: number;
  approvedCount: number;
  balances?: LeaveBalance[];
}

export interface LeaveOnDate {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  fromDate: string;
  toDate: string;
}

export interface AttendancePunch {
  _id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  note?: string;
  hours?: number | null;
}

export interface AttendancePresentPerson {
  employeeId: string;
  employeeName: string;
  designation?: string;
  attendance?: AttendancePunch | null;
  status?: 'CLOCKED' | 'ABSENT' | 'ON_LEAVE';
}

export interface AttendanceOnLeavePerson {
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
}

export interface DailyLeaveAttendance {
  date: string;
  presentCount: number;
  clockedCount?: number;
  absentCount?: number;
  onLeaveCount: number;
  totalEmployees: number;
  present: AttendancePresentPerson[];
  absent?: AttendancePresentPerson[];
  onLeave: AttendanceOnLeavePerson[];
  holiday?: { name: string; optional?: boolean } | null;
}

export interface LeaveHistoryItem {
  fromDate: string;
  toDate: string;
  days: number;
  status?: string;
}

export interface EmployeeLeaveHistory {
  employeeId: string;
  employeeName: string;
  totalLeaveDays: number;
  history: LeaveHistoryItem[];
}

export interface ProjectDeadline {
  id: string;
  name: string;
  deadline: string;
}

export interface ProjectDocumentFile {
  _id: string;
  projectId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedBy?: User | string;
  createdAt: string;
}
