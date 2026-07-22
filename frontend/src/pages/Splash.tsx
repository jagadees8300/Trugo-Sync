import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            marginBottom: 16,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <BrandLogo height={160} style={{ borderRadius: 12 }} />
        </button>

        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
          Productivity Redefined
        </p>
        <p
          style={{
            color: '#ff9800',
            fontSize: '18px',
            margin: '14px 0 0',
            fontWeight: 600,
          }}
        >
          👆 Tap logo to continue
        </p>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div className="splash-bar-track">
          <div className="splash-bar-indicator" />
        </div>
        <span style={{ fontSize: '10px', color: '#bbb' }}>V1.0.4</span>
      </div>
    </div>
  );
};

export default Splash;
