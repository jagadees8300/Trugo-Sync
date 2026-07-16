import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import LeaveSummaryCards from '../components/LeaveSummaryCards';
import LeaveTable from '../components/LeaveTable';
import LeaveCalendar, { toIsoDate } from '../components/LeaveCalendar';
import LeaveHistory from '../components/LeaveHistory';
import CreateLeaveForm from '../components/CreateLeaveForm';
import ClockCard from '../components/ClockCard';
import { leaveApi } from '../services/leaveService';
import { getCurrentUserId } from '../utils/task';
import type { EmployeeLeaveHistory, LeaveRequest, MyLeaveSummary } from '../types';

type LeaveFilter = 'ALL' | 'PENDING';

const MyLeavePage = () => {
  const userId = getCurrentUserId();
  const [stats, setStats] = useState<MyLeaveSummary>({
    totalLeaveDays: 0,
    pendingCount: 0,
    approvedCount: 0,
  });
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<LeaveFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(toIsoDate(new Date()));
  const [calendarDates, setCalendarDates] = useState<string[]>([]);
  const [history, setHistory] = useState<EmployeeLeaveHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  }, []);

  const loadMain = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, mineRes, calendarRes] = await Promise.all([
        leaveApi.getMySummary(),
        leaveApi.getMine(),
        leaveApi.getMyCalendar(),
      ]);
      setStats(summaryRes.data);
      setAllLeaves(mineRes.data);
      setLeaves(
        filter === 'PENDING'
          ? mineRes.data.filter((l) => l.status === 'Pending')
          : mineRes.data,
      );
      setCalendarDates(calendarRes.data);
    } catch (err) {
      console.error('Failed to load my leave data', err);
      showToast('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    void loadMain();
  }, [loadMain]);

  useEffect(() => {
    if (!userId) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await leaveApi.getEmployeeHistory(userId);
        setHistory(res.data);
      } catch {
        setHistory(null);
      } finally {
        setLoadingHistory(false);
      }
    };
    void loadHistory();
  }, [userId]);

  const leaveDates = useMemo(() => new Set(calendarDates), [calendarDates]);

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const onDatePeople = useMemo(() => {
    if (!selectedDate || !leaveDates.has(selectedDate) || !userId) return [];
    const match = allLeaves.find((leave) => {
      if (leave.status !== 'Approved') return false;
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      const sel = new Date(selectedDate + 'T00:00:00');
      return sel >= from && sel <= to;
    });
    if (!match) {
      return [
        {
          employeeId: userId,
          employeeName: 'You',
          totalDays: 1,
          fromDate: selectedDate,
          toDate: selectedDate,
        },
      ];
    }
    return [
      {
        employeeId: match.employeeId,
        employeeName: match.employeeName,
        totalDays: match.totalDays,
        fromDate: match.fromDate,
        toDate: match.toDate,
      },
    ];
  }, [allLeaves, leaveDates, selectedDate, userId]);

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

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>My Leave</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Your leave requests, calendar and history
          </p>
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

        <LeaveSummaryCards stats={stats} loading={loading} variant="personal" />

        <ClockCard />

        {!loading && stats.balances && stats.balances.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {stats.balances.map((b) => (
              <div
                key={b.leaveType}
                className="card"
                style={{ flex: '1 1 140px', padding: 16, textAlign: 'center' }}
              >
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                  {b.leaveType} LEFT
                </p>
                <h2 style={{ margin: 0 }}>{b.remaining}</h2>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  of {b.allocated} ({b.used} used)
                </p>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <CreateLeaveForm
            employeeOnly
            onCreated={() => void loadMain()}
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
          <h4 style={{ margin: 0 }}>My Leave Requests</h4>
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
            showActions={false}
            showEmployeeLink={false}
          />
        </div>

        <div className="leave-lower-grid">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>My Leave Calendar</h4>
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
            loadingDate={false}
            history={history}
            loadingHistory={loadingHistory}
            onEmployeeClick={() => {}}
          />
        </div>
      </div>
    </>
  );
};

export default MyLeavePage;
