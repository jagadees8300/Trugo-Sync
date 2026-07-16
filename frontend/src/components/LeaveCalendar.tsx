import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaveCalendarProps {
  month: Date;
  selectedDate: string | null;
  leaveDates: Set<string>;
  onMonthChange: (next: Date) => void;
  onSelectDate: (isoDate: string) => void;
}

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const LeaveCalendar = ({
  month,
  selectedDate,
  leaveDates,
  onMonthChange,
  onSelectDate,
}: LeaveCalendarProps) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const grid: Array<{ date: Date | null; iso: string | null }> = [];

    for (let i = 0; i < startDay; i += 1) {
      grid.push({ date: null, iso: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      grid.push({ date, iso: toIsoDate(date) });
    }
    return grid;
  }, [year, monthIndex]);

  const title = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button
          type="button"
          className="leave-icon-btn"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft size={18} />
        </button>
        <h4 style={{ margin: 0 }}>{title}</h4>
        <button
          type="button"
          className="leave-icon-btn"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="leave-calendar-grid leave-calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="leave-calendar-weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="leave-calendar-grid">
        {cells.map((cell, idx) => {
          if (!cell.iso || !cell.date) {
            return <div key={`empty-${idx}`} className="leave-calendar-day leave-calendar-day--empty" />;
          }
          const hasLeave = leaveDates.has(cell.iso);
          const selected = selectedDate === cell.iso;
          const isToday = cell.iso === toIsoDate(new Date());

          return (
            <button
              key={cell.iso}
              type="button"
              className={`leave-calendar-day ${hasLeave ? 'leave-calendar-day--leave' : ''} ${selected ? 'leave-calendar-day--selected' : ''} ${isToday ? 'leave-calendar-day--today' : ''}`}
              onClick={() => onSelectDate(cell.iso!)}
            >
              {cell.date.getDate()}
              {hasLeave && <span className="leave-calendar-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveCalendar;
export { toIsoDate };
