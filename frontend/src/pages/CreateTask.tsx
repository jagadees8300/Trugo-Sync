import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, Calendar, CheckSquare } from 'lucide-react';

const CreateTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    project: 'Phoenix Project',
    priority: 'High',
    deadline: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/tasks', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create task', error);
      alert('Failed to create task');
    }
  };

  return (
    <>
      <div className="app-container" style={{ padding: '0', backgroundColor: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Top App Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: '#fff', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', color: '#b45309' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Create Task</h2>
          </div>
          <div style={{ cursor: 'pointer', color: '#4b5563' }}>
            <Search size={24} />
          </div>
        </div>

        {/* Form Content */}
        <div style={{ padding: '24px', flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '32px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <form onSubmit={handleSubmit}>
              
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: '#4b5563', marginBottom: 12 }}>Task Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, padding: '12px 0', fontSize: 15 }}
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter task name..."
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: '#4b5563', marginBottom: 12 }}>Description</label>
                <textarea 
                  className="form-input" 
                  style={{ border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, padding: '12px 0', fontSize: 15, minHeight: 80, resize: 'none' }}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Add detailed notes about this task..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: '#4b5563', marginBottom: 12 }}>Assigned To</label>
                <select 
                  className="form-input" 
                  style={{ border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, padding: '12px 0', fontSize: 15, backgroundColor: 'transparent', appearance: 'none', cursor: 'pointer' }}
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                >
                  <option value="" disabled>Select assignee</option>
                  <option value="hari">Hariharan</option>
                  <option value="gopi">Gopinath</option>
                  <option value="jagan">Jaganathan</option>
                </select>
                <div style={{ position: 'absolute', right: 0, top: 40, pointerEvents: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: '#4b5563', marginBottom: 12 }}>Project</label>
                <select 
                  className="form-input" 
                  style={{ border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, padding: '12px 0', fontSize: 15, backgroundColor: 'transparent', appearance: 'none', cursor: 'pointer' }}
                  value={formData.project}
                  onChange={(e) => setFormData({...formData, project: e.target.value})}
                >
                  <option value="Phoenix Project">Phoenix Project</option>
                  <option value="Tru Go">Tru Go</option>
                  <option value="Steno Space">Steno Space</option>
                </select>
                <div style={{ position: 'absolute', right: 0, top: 40, pointerEvents: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: '#4b5563', marginBottom: 12 }}>Priority</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, priority: 'High'})}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      borderRadius: 24, 
                      border: formData.priority === 'High' ? '1px solid #fbbf24' : '1px solid transparent', 
                      backgroundColor: formData.priority === 'High' ? '#fef3c7' : '#f3f4f6',
                      color: formData.priority === 'High' ? '#b45309' : '#4b5563',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>!</span> High
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, priority: 'Low'})}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      borderRadius: 24, 
                      border: formData.priority === 'Low' ? '1px solid #9ca3af' : '1px solid transparent', 
                      backgroundColor: formData.priority === 'Low' ? '#e5e7eb' : '#f3f4f6',
                      color: '#4b5563',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    Low
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 40 }}>
                <label className="form-label" style={{ color: '#4b5563', marginBottom: 12 }}>Deadline</label>
                <div style={{ position: 'relative', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={20} color="#4b5563" style={{ marginRight: 12 }} />
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ border: 'none', borderRadius: 0, padding: '12px 0', fontSize: 15, flex: 1, backgroundColor: 'transparent' }}
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    placeholder="dd-mm-yyyy"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px 0', fontSize: 16, borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                Create Task <CheckSquare size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateTask;
