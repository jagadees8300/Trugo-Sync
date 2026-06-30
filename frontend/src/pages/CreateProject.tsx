import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const CreateProject = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/projects', {
        name,
        description,
        category,
        deadline: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create project', error);
      alert('Failed to create project');
    }
  };

  return (
    <>
      <BottomNav />
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <Link to="/dashboard" style={{ color: 'var(--text-main)' }}>
            <ArrowLeft size={24} />
          </Link>
          <h3 style={{ margin: 0 }}>Create Project</h3>
          <div style={{ flex: 1 }}></div>
          <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', overflow: 'hidden' }}>
            <img src="https://i.pravatar.cc/100?img=11" alt="Profile" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter project title..." 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              placeholder="Describe the project goals and scope..." 
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'none' }}
            ></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Project Category</label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {['Frontend', 'Backend', 'UI', 'QA'].map(cat => (
                <button 
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 20, 
                    border: category === cat ? '1px solid var(--primary)' : '1px solid #eee',
                    background: category === cat ? '#fff9f0' : 'white',
                    color: category === cat ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Team Members</label>
              <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>+ Add Member</span>
            </div>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex' }}>
                <img src="https://i.pravatar.cc/100?img=12" alt="Hari" style={{ width: 32, height: 32, borderRadius: 16, border: '2px solid white', marginLeft: 0 }} />
                <img src="https://i.pravatar.cc/100?img=13" alt="Gopi" style={{ width: 32, height: 32, borderRadius: 16, border: '2px solid white', marginLeft: -12 }} />
                <img src="https://i.pravatar.cc/100?img=14" alt="Someone" style={{ width: 32, height: 32, borderRadius: 16, border: '2px solid white', marginLeft: -12 }} />
                <div style={{ width: 32, height: 32, borderRadius: 16, border: '2px solid white', marginLeft: -12, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
                  +4
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>7 People Assigned</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 24 }}>
            Create Project 🚀
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateProject;
