import type { EmployeeLeaveHistory, LeaveOnDate } from '../types';

interface LeaveHistoryProps {
  selectedDateLabel: string | null;
  onDatePeople: LeaveOnDate[];
  loadingDate?: boolean;
  history: EmployeeLeaveHistory | null;
  loadingHistory?: boolean;
  onEmployeeClick: (employeeId: string) => void;
  onCloseHistory?: () => void;
}

const formatRange = (from: string, to: string, days: number) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const same =
    fromDate.getFullYear() === toDate.getFullYear() &&
    fromDate.getMonth() === toDate.getMonth() &&
    fromDate.getDate() === toDate.getDate();

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  if (same) return `${fmt(fromDate)} (${days} Day${days === 1 ? '' : 's'})`;
  return `${fmt(fromDate)} - ${fmt(toDate)} (${days} Day${days === 1 ? '' : 's'})`;
};

const LeaveHistory = ({
  selectedDateLabel,
  onDatePeople,
  loadingDate,
  history,
  loadingHistory,
  onEmployeeClick,
  onCloseHistory,
}: LeaveHistoryProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <h4 style={{ margin: '0 0 12px' }}>
          {selectedDateLabel ? selectedDateLabel : 'Select a date'}
        </h4>
        {!selectedDateLabel ? (
          <p className="text-muted" style={{ margin: 0 }}>
            Click a date on the calendar to see who is on leave.
          </p>
        ) : loadingDate ? (
          <p className="text-muted" style={{ margin: 0 }}>
            Loading...
          </p>
        ) : onDatePeople.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            No employees on leave this day.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
              Employees On Leave
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onDatePeople.map((person) => (
                <button
                  key={`${person.employeeId}-${person.fromDate}`}
                  type="button"
                  className="leave-person-row"
                  onClick={() => onEmployeeClick(person.employeeId)}
                >
                  <span>{person.employeeName}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {person.totalDays} Day{person.totalDays === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {(history || loadingHistory) && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Employee Leave History</h4>
            {onCloseHistory && (
              <button type="button" className="leave-link-btn" onClick={onCloseHistory}>
                Close
              </button>
            )}
          </div>
          {loadingHistory ? (
            <p className="text-muted" style={{ margin: 0 }}>
              Loading history...
            </p>
          ) : history ? (
            <>
              <h3 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>{history.employeeName}</h3>
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>
                Total Leave Days : <strong>{history.totalLeaveDays}</strong>
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
                Leave History
              </p>
              {history.history.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>
                  No approved leave history.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {history.history.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 8, fontSize: 14 }}>
                      {formatRange(item.fromDate, item.toDate, item.days)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LeaveHistory;
