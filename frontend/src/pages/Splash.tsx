import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

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
        position: 'relative'
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        {/* Logo Icon */}
        <div 
          onClick={() => navigate('/login')}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#ff9800',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
            cursor: 'pointer'
          }}
        >
          <Zap size={40} color="white" fill="white" />
        </div>

        {/* Title */}
        <h1 style={{ color: '#ff9800', fontSize: '28px', marginBottom: '8px', fontWeight: 'bold' }}>
          Trugo Sync
        </h1>
        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
          Productivity Redefined
        </p>
      </div>

      {/* Bottom Loading Bar */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          width: '200px',
          height: '4px',
          backgroundColor: '#f0f0f0',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '70%',
            height: '100%',
            backgroundColor: '#ff9800',
            float: 'right'
          }} />
        </div>
        <span style={{ fontSize: '10px', color: '#bbb' }}>V1.0.4</span>
      </div>
    </div>
  );
};

export default Splash;
