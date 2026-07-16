import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usersApi } from '../services/api';
import { leaveApi } from '../services/leaveService';
import { getEntityId } from '../utils/id';
import { getCurrentUserId, isAdmin, canApproveLeave } from '../utils/task';
import type { User } from '../types';

interface CreateLeaveFormProps {
  onCreated: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  employeeOnly?: boolean;
}

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'SICK', label: 'Sick' },
  { value: 'EARNED', label: 'Earned' },
  { value: 'UNPAID', label: 'Unpaid' },
] as const;

const daysBetween = (from: string, to: string) => {
  if (!from || !to) return 0;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const CreateLeaveForm = ({ onCreated, onSuccess, onError, employeeOnly }: CreateLeaveFormProps) => {
  const currentUserId = getCurrentUserId();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(!employeeOnly);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employeeId: employeeOnly ? currentUserId : '',
    fromDate: '',
    toDate: '',
    leaveType: 'CASUAL',
    isHalfDay: false,
    halfDaySession: 'AM' as 'AM' | 'PM',
  });

  useEffect(() => {
    if (employeeOnly) {
      setForm((prev) => ({ ...prev, employeeId: currentUserId }));
      return;
    }
    const load = async () => {
      setLoadingUsers(true);
      try {
        const res =
          isAdmin() || canApproveLeave()
            ? await usersApi.getAll()
            : await usersApi.getAssignees();
        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch {
        onError('Could not load employees for leave form');
      } finally {
        setLoadingUsers(false);
      }
    };
    void load();
  }, [onError, employeeOnly, currentUserId]);

  const totalDays = useMemo(() => {
    if (form.isHalfDay) return 0.5;
    return daysBetween(form.fromDate, form.toDate);
  }, [form.fromDate, form.toDate, form.isHalfDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) {
      onError('Please select an employee');
      return;
    }
    if (!form.fromDate || !form.toDate) {
      onError('Please select from and to dates');
      return;
    }
    if (form.isHalfDay && form.fromDate !== form.toDate) {
      onError('Half-day leave must be a single date');
      return;
    }
    if (totalDays < 0.5) {
      onError('To date must be on or after from date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await leaveApi.create({
        employeeId: form.employeeId!,
        fromDate: form.fromDate,
        toDate: form.isHalfDay ? form.fromDate : form.toDate,
        leaveType: form.leaveType,
        isHalfDay: form.isHalfDay,
        halfDaySession: form.isHalfDay ? form.halfDaySession : undefined,
      });
      onSuccess(res.data.message || 'Leave request created successfully');
      setForm({
        employeeId: employeeOnly ? getCurrentUserId() : '',
        fromDate: '',
        toDate: '',
        leaveType: 'CASUAL',
        isHalfDay: false,
        halfDaySession: 'AM',
      });
      onCreated();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to create leave request';
      onError(typeof message === 'string' ? message : 'Failed to create leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card create-leave-form" onSubmit={handleSubmit}>
      <h4 style={{ margin: '0 0 16px' }}>Create Leave Request</h4>
      <div className="create-leave-grid">
        {!employeeOnly && (
          <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label className="form-label">Employee</label>
            <select
              className="form-input"
              value={form.employeeId ?? ''}
              disabled={loadingUsers || submitting}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
              style={{ appearance: 'none', paddingRight: 32 }}
            >
              <option value="">{loadingUsers ? 'Loading...' : 'Select employee'}</option>
              {users.map((u) => {
                const id = getEntityId(u);
                return (
                  <option key={id} value={id}>
                    {u.name}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              size={16}
              style={{ position: 'absolute', right: 12, bottom: 14, color: '#6b7280', pointerEvents: 'none' }}
            />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
          <label className="form-label">Leave Type</label>
          <select
            className="form-input"
            value={form.leaveType}
            disabled={submitting}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            style={{ appearance: 'none', paddingRight: 32 }}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{ position: 'absolute', right: 12, bottom: 14, color: '#6b7280', pointerEvents: 'none' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">From Date</label>
          <input
            type="date"
            className="form-input"
            value={form.fromDate}
            disabled={submitting}
            onChange={(e) => {
              const fromDate = e.target.value;
              setForm({
                ...form,
                fromDate,
                toDate: form.isHalfDay ? fromDate : form.toDate,
              });
            }}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">To Date</label>
          <input
            type="date"
            className="form-input"
            value={form.toDate}
            disabled={submitting || form.isHalfDay}
            onChange={(e) => setForm({ ...form, toDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Half Day</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.isHalfDay}
              disabled={submitting}
              onChange={(e) => {
                const isHalfDay = e.target.checked;
                setForm({
                  ...form,
                  isHalfDay,
                  toDate: isHalfDay ? form.fromDate : form.toDate,
                });
              }}
            />
            Request half day
          </label>
        </div>

        {form.isHalfDay && (
          <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label className="form-label">Session</label>
            <select
              className="form-input"
              value={form.halfDaySession}
              disabled={submitting}
              onChange={(e) =>
                setForm({ ...form, halfDaySession: e.target.value as 'AM' | 'PM' })
              }
              style={{ appearance: 'none', paddingRight: 32 }}
            >
              <option value="AM">Morning (AM)</option>
              <option value="PM">Afternoon (PM)</option>
            </select>
            <ChevronDown
              size={16}
              style={{ position: 'absolute', right: 12, bottom: 14, color: '#6b7280', pointerEvents: 'none' }}
            />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Total Days</label>
          <input
            type="text"
            className="form-input"
            value={totalDays > 0 ? String(totalDays) : '—'}
            readOnly
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || (!employeeOnly && loadingUsers)}
        style={{ marginTop: 16, width: 'auto', padding: '10px 20px' }}
      >
        {submitting ? 'Creating...' : 'Create Leave'}
      </button>
    </form>
  );
};

export default CreateLeaveForm;
