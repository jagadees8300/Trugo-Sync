import { Link, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Folder, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="bottom-nav">
      <Link to="/dashboard" className={`nav-item ${path === '/dashboard' ? 'active' : ''}`}>
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link to="#" className={`nav-item ${path === '/tasks' ? 'active' : ''}`}>
        <CheckSquare size={20} />
        <span>Tasks</span>
      </Link>
      <Link to="/create-project" className={`nav-item ${path === '/create-project' ? 'active' : ''}`}>
        <Folder size={20} />
        <span>Projects</span>
      </Link>
      <Link to="#" className={`nav-item ${path === '/profile' ? 'active' : ''}`}>
        <User size={20} />
        <span>Profile</span>
      </Link>
    </div>
  );
};

export default BottomNav;
