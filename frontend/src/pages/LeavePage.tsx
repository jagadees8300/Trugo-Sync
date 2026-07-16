import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import LeaveSummaryCards from '../components/LeaveSummaryCards';
import LeaveTable from '../components/LeaveTable';
import LeaveCalendar, { toIsoDate } from '../components/LeaveCalendar';
import LeaveHistory from '../components/LeaveHistory';
import CreateLeaveForm from '../components/CreateLeaveForm';
import { leaveApi } from '../services/leaveService';
import type {
  EmployeeLeaveHistory,
  LeaveDashboard,
  LeaveOnDate,
  LeaveRequest,
} from '../types';

type LeaveFilter = 'ALL' | 'PENDING';

const LeavePage = () => {
  const [stats, setStats] = useState<LeaveDashboard>({
    present: 0,
    absent: 0,
    onLeave: 0,
    pending: 0,
  });
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<LeaveFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(toIsoDate(new Date()));
  const [onDatePeople, setOnDatePeople] = useState<LeaveOnDate[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [history, setHistory] = useState<EmployeeLeaveHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  }, []);

  const refreshDatePeople = useCallback(async (date: string | null) => {
    if (!date) return;
    setLoadingDate(true);
    try {
      const res = await leaveApi.getByDate(date);
      setOnDatePeople(res.data);
    } catch (err) {
      console.error('Failed to load leave by date', err);
      setOnDatePeople([]);
    } finally {
      setLoadingDate(false);
    }
  }, []);

  const loadMain = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, allRes, pendingRes] = await Promise.all([
        leaveApi.getDashboard(),
        leaveApi.getAll(),
        leaveApi.getPending(),
      ]);
      setStats(dashRes.data);
      setAllLeaves(allRes.data);
      setLeaves(filter === 'PENDING' ? pendingRes.data : allRes.data);
    } catch (err) {
      console.error('Failed to load leave data', err);
      showToast('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    void loadMain();
  }, [loadMain]);

  useEffect(() => {
    void refreshDatePeople(selectedDate);
  }, [selectedDate, refreshDatePeople]);

  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    for (const leave of allLeaves) {
      if (leave.status !== 'Approved') continue;
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        set.add(toIsoDate(d));
      }
    }
    return set;
  }, [allLeaves]);

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      const res = await leaveApi.approve(id);
      showToast(res.data.message || 'Leave Approved Successfully');
      await loadMain();
      await refreshDatePeople(selectedDate);
      if (history?.employeeId) {
        const hist = await leaveApi.getEmployeeHistory(history.employeeId);
        setHistory(hist.data);
      }
    } catch {
      showToast('Failed to approve leave');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    try {
      const res = await leaveApi.reject(id);
      showToast(res.data.message || 'Leave Rejected Successfully');
      await loadMain();
    } catch {
      showToast('Failed to reject leave');
    } finally {
      setActingId(null);
    }
  };

  const openEmployeeHistory = async (employeeId: string) => {
    setLoadingHistory(true);
    try {
      const res = await leaveApi.getEmployeeHistory(employeeId);
      setHistory(res.data);
    } catch {
      showToast('Failed to load employee history');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
            borderBottom: '1px solid #eee',
            paddingBottom: 16,
          }}
        >
          <div style={{ cursor: 'pointer', padding: 8, backgroundColor: '#fff9f0', borderRadius: 8 }}>
            <Menu size={24} color="var(--primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <UserMenu size={36} />
          </div>
        </div>

        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 26 }}>Leave</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Manage leave requests, calendar and employee history
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to="/leave/attendance"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Daily attendance
            </Link>
            <Link
              to="/leave/holidays"
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                background: '#fff',
              }}
            >
              Holidays
            </Link>
          </div>
        </div>

        {toast && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#fff9f0',
              border: '1px solid #fed7aa',
              color: '#b45309',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {toast}
          </div>
        )}

        <LeaveSummaryCards stats={stats} loading={loading} />

        <div style={{ marginBottom: 28 }}>
          <CreateLeaveForm
            onCreated={() => {
              void loadMain();
              void refreshDatePeople(selectedDate);
            }}
            onSuccess={showToast}
            onError={showToast}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <h4 style={{ margin: 0 }}>Leave Request Table</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { key: 'ALL', label: 'All' },
              { key: 'PENDING', label: 'Pending' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  backgroundColor: filter === tab.key ? 'var(--primary)' : '#f3f4f6',
                  color: filter === tab.key ? '#fff' : '#6b7280',
                  fontWeight: 500,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 28 }}>
          <LeaveTable
            leaves={leaves}
            loading={loading}
            actingId={actingId}
            onApprove={handleApprove}
            onReject={handleReject}
            onEmployeeClick={(employeeId) => void openEmployeeHistory(employeeId)}
          />
        </div>

        <div className="leave-lower-grid">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Monthly Calendar</h4>
            </div>
            <LeaveCalendar
              month={month}
              selectedDate={selectedDate}
              leaveDates={leaveDates}
              onMonthChange={setMonth}
              onSelectDate={setSelectedDate}
            />
          </div>

          <LeaveHistory
            selectedDateLabel={selectedDateLabel}
            onDatePeople={onDatePeople}
            loadingDate={loadingDate}
            history={history}
            loadingHistory={loadingHistory}
            onEmployeeClick={(employeeId) => void openEmployeeHistory(employeeId)}
            onCloseHistory={() => setHistory(null)}
          />
        </div>
      </div>
    </>
  );
};

export default LeavePage;
