import { Link, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Folder, Video, CalendarDays, Bell } from 'lucide-react';
import { getHomePathForRole, getLeavePathForRole, getUserRole, isClientRole } from '../utils/task';
import { DAILY_MEETING_URL } from '../constants/meeting';
import BrandLogo from './BrandLogo';

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const role = getUserRole();
  const homePath = getHomePathForRole(role);
  const leavePath = getLeavePathForRole(role);
  const client = isClientRole(role);

  return (
    <div className="bottom-nav">
      <Link
        to={homePath}
        className="bottom-nav__brand"
        style={{
          display: 'none',
          textDecoration: 'none',
          marginBottom: 24,
          padding: '0 4px',
        }}
      >
        <BrandLogo height={44} style={{ borderRadius: 8, width: '100%', maxWidth: 200 }} />
      </Link>
      <Link to={homePath} className={`nav-item ${path === homePath ? 'active' : ''}`}>
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link
        to="/projects"
        className={`nav-item ${path === '/projects' || path === '/create-project' || path.startsWith('/projects/') ? 'active' : ''}`}
      >
        <Folder size={20} />
        <span>Projects</span>
      </Link>
      <Link to="/tasks" className={`nav-item ${path.startsWith('/tasks') || path === '/create-task' ? 'active' : ''}`}>
        <CheckSquare size={20} />
        <span>Tasks</span>
      </Link>
      {client ? (
        <Link
          to="/notifications"
          className={`nav-item ${path.startsWith('/notifications') ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>Alerts</span>
        </Link>
      ) : (
        <a
          href={DAILY_MEETING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-item"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Video size={20} />
          <span>Meet</span>
        </a>
      )}
      {!client && (
        <Link
          to={leavePath}
          className={`nav-item ${path === leavePath || path.startsWith('/my-leave') || path.startsWith('/leave') ? 'active' : ''}`}
        >
          <CalendarDays size={20} />
          <span>Leave</span>
        </Link>
      )}
    </div>
  );
};

export default BottomNav;
