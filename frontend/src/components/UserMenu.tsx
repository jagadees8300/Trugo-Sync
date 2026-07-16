import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { getStoredUserAvatar } from '../utils/task';

type UserMenuProps = {
  avatarUrl?: string;
  size?: number;
};

const logout = (navigate: ReturnType<typeof useNavigate>) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  navigate('/login', { replace: true });
};

const UserMenu = ({ avatarUrl, size = 40 }: UserMenuProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState(avatarUrl || getStoredUserAvatar());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSrc(avatarUrl || getStoredUserAvatar());
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#eee',
          overflow: 'hidden',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        <img
          src={src}
          alt="Profile"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 160,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #f3f4f6',
            padding: 6,
            zIndex: 200,
          }}
        >
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              color: '#111827',
              fontSize: 14,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff9f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <UserRound size={16} color="var(--primary)" />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout(navigate);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#dc2626',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
