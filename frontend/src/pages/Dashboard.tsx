import { Link } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const Dashboard = () => {
  return (
    <>
      <BottomNav />
      <div className="app-container" style={{ padding: '24px 40px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
          <div style={{ cursor: 'pointer', padding: 8, backgroundColor: '#fff9f0', borderRadius: 8 }}>
            <Menu size={24} color="var(--primary)" />
          </div>
          <div style={{ cursor: 'pointer', padding: 8, backgroundColor: '#f0f0f0', borderRadius: '50%', display: 'flex' }}>
            <User size={24} color="#666" />
          </div>
        </div>

        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' }}>Trugo Sync Admin</p>
            <h2 style={{ marginBottom: 0 }}>Welcome Back</h2>
            <h3 style={{ color: 'var(--primary)', marginBottom: 0 }}>Senthil Kumar</h3>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', overflow: 'hidden' }}>
            <img src="https://i.pravatar.cc/100?img=11" alt="Profile" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Link to="/create-task" className="btn btn-primary" style={{ flex: 1, padding: '12px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>+ Create Task</Link>
          <Link to="/create-project" className="btn" style={{ flex: 1, border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent', padding: '12px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>+ Create Project</Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>Overall Task Status</h4>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>View all</span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL</p>
            <h2 style={{ margin: 0 }}>18</h2>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>COMPLETED</p>
            <h2 style={{ margin: 0 }}>04</h2>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>PENDING</p>
            <h2 style={{ margin: 0 }}>14</h2>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>Team Status</h4>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>View all</span>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://i.pravatar.cc/100?img=12" alt="Hari" style={{ width: 24, height: 24, borderRadius: 12 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Hariharan</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>75%</span>
          </div>
          <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ width: '75%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Total: 12 | Done: 9 | Pending: 3</p>
          
          <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://i.pravatar.cc/100?img=13" alt="Jaganathan" style={{ width: 24, height: 24, borderRadius: 12 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Jaganathan</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>80%</span>
          </div>
          <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ width: '80%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Total: 25 | Done: 20 | Pending: 5</p>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap' }}>
          
          {/* Left Column: Project Progress */}
          <div style={{ flex: '1 1 60%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Project Progress</h4>
            </div>
            <div className="card" style={{ padding: 16 }}>
              {/* Tru Go */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Tru Go</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>75%</span>
              </div>
              <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ width: '75%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Total Tasks: 20 | Done: 15 | Active: 05</p>
              
              <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />

              {/* Steno Space */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Steno Space</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>10%</span>
              </div>
              <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ width: '10%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Total Tasks: 20 | Done: 2 | Active: 18</p>

              <hr style={{ border: 0, borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />

              {/* Lottey Magazine */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Lottey Magazine</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>50%</span>
              </div>
              <div style={{ width: '100%', height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Total Tasks: 20 | Done: 10 | Active: 10</p>
            </div>
          </div>

          {/* Right Column: Join Meeting & Timelines */}
          <div style={{ flex: '1 1 30%', minWidth: 250 }}>
            <div className="card" style={{ backgroundColor: '#fff7ed', padding: 16, marginBottom: 16, border: '1px solid #ffedd5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ backgroundColor: '#f97316', padding: 8, borderRadius: 8, color: 'white' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1f2937' }}>Daily Sync</h5>
                    <p style={{ margin: 0, fontSize: 12, color: '#4b5563', marginTop: 4 }}>Starts in 15 mins - 10.00 AM</p>
                  </div>
                </div>
                <div style={{ display: 'flex', marginLeft: -8, alignItems: 'center' }}>
                  <img src="https://i.pravatar.cc/100?img=11" alt="avatar" style={{ width: 26, height: 26, borderRadius: 13, border: '2px solid white' }} />
                  <img src="https://i.pravatar.cc/100?img=12" alt="avatar" style={{ width: 26, height: 26, borderRadius: 13, border: '2px solid white', marginLeft: -8 }} />
                  <div style={{ width: 26, height: 26, borderRadius: 13, border: '2px solid white', marginLeft: -8, backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#4b5563' }}>+6</div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '10px 0', fontSize: 14, backgroundColor: '#fed7aa', color: '#9a3412', border: 'none', fontWeight: 500, borderRadius: 8 }}>
                Join Meeting
              </button>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h5 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#1f2937', fontWeight: 500 }}>Your Projects & Deadlines</h5>
              <hr style={{ border: 0, borderTop: '1px solid #f3f4f6', margin: '0 0 16px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>Blood Space</span>
                <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>Tomorrow</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>ZeroFat</span>
                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>Oct 29</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>Union Insurance</span>
                <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>Nov 04</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
