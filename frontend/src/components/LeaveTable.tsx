import type { LeaveRequest } from '../types';

interface LeaveTableProps {
  leaves: LeaveRequest[];
  loading?: boolean;
  actingId?: string | null;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEmployeeClick?: (employeeId: string, employeeName: string) => void;
  showActions?: boolean;
  showEmployeeLink?: boolean;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const statusStyle = (status: LeaveRequest['status']) => {
  if (status === 'Approved') return { bg: '#d1fae5', color: '#065f46' };
  if (status === 'Rejected') return { bg: '#fee2e2', color: '#b91c1c' };
  return { bg: '#fef3c7', color: '#92400e' };
};

const LeaveTable = ({
  leaves,
  loading,
  actingId,
  onApprove,
  onReject,
  onEmployeeClick,
  showActions = true,
  showEmployeeLink = true,
}: LeaveTableProps) => {
  if (loading) {
    return <p className="text-muted">Loading leave requests...</p>;
  }

  if (leaves.length === 0) {
    return <p className="text-muted">No leave requests found.</p>;
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="leave-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Total Days</th>
              <th>Status</th>
              {showActions && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => {
              const badge = statusStyle(leave.status);
              const busy = actingId === leave._id;
              return (
                <tr key={leave._id}>
                  <td>
                    {showEmployeeLink && onEmployeeClick ? (
                      <button
                        type="button"
                        className="leave-link-btn"
                        onClick={() => onEmployeeClick(leave.employeeId, leave.employeeName)}
                      >
                        {leave.employeeName}
                      </button>
                    ) : (
                      leave.employeeName
                    )}
                  </td>
                  <td>{formatDate(leave.fromDate)}</td>
                  <td>{formatDate(leave.toDate)}</td>
                  <td>{leave.totalDays}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {leave.status}
                    </span>
                  </td>
                  {showActions && (
                    <td>
                      {leave.status === 'Pending' && onApprove && onReject ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
                            disabled={busy}
                            onClick={() => onApprove(leave._id)}
                          >
                            {busy ? '...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              width: 'auto',
                              padding: '6px 12px',
                              fontSize: 12,
                              border: '1px solid #ef4444',
                              color: '#b91c1c',
                              background: '#fff',
                            }}
                            disabled={busy}
                            onClick={() => onReject(leave._id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveTable;
