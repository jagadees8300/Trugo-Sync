import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, CheckSquare, ChevronDown } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { tasksApi, usersApi, projectsApi } from '../services/api';
import { getEntityId } from '../utils/id';
import { getHomePathForRole, isClientRole } from '../utils/task';
import type { User, Project } from '../types';

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 32px 12px 0',
  fontSize: 15,
  border: 'none',
  borderBottom: '1px solid #e5e7eb',
  borderRadius: 0,
  backgroundColor: 'transparent',
  cursor: 'pointer',
  outline: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  color: '#111827',
};

const CreateTask = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientMode = isClientRole();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    project: '',
    priority: clientMode ? 'HIGH' : 'MEDIUM',
    deadline: '',
    parentTaskId: '',
    dependsOn: '',
    milestoneId: '',
  });

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setLoadError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadError('Please log in again to load assignees and projects.');
        return;
      }

      const [usersRes, projectsRes] = await Promise.all([
        usersApi.getAssignees(),
        projectsApi.getAll(),
      ]);

      const userList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const projectList = Array.isArray(projectsRes.data) ? projectsRes.data : [];

      setUsers(userList);
      setProjects(projectList);

      const preselectedAssignee = searchParams.get('assignedTo') || '';
      const preselectedProject = searchParams.get('project') || '';
      const preselectedParent = searchParams.get('parentTaskId') || '';

      setFormData((prev) => ({
        ...prev,
        assignedTo: preselectedAssignee,
        project: preselectedProject || (clientMode && projectList[0] ? projectList[0]._id : ''),
        parentTaskId: preselectedParent,
        priority: clientMode ? 'HIGH' : prev.priority,
      }));
    } catch (err) {
      console.error('Failed to load form data', err);
      setLoadError('Could not load assignees or projects. Make sure the backend is running on port 5000.');
    } finally {
      setLoadingOptions(false);
    }
  }, [searchParams, clientMode]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assignedTo) {
      alert('Please select an assignee.');
      return;
    }
    if (!formData.project) {
      alert('Please select a project.');
      return;
    }

    setSubmitting(true);
    try {
      await tasksApi.create({
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        projectId: formData.project,
        priority: clientMode ? 'HIGH' : formData.priority,
        deadline: formData.deadline || undefined,
        parentTaskId: formData.parentTaskId || undefined,
        dependsOn: formData.dependsOn
          ? formData.dependsOn.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        milestoneId: formData.milestoneId || undefined,
      });
      if (clientMode) {
        navigate(getHomePathForRole());
      } else {
        navigate(`/tasks/user/${formData.assignedTo}`);
      }
    } catch (error) {
      console.error('Failed to create task', error);
      alert(
        clientMode
          ? 'Failed to assign task. Check assignee and project are selected.'
          : 'Failed to create task. Check assignee and project are selected.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const assigneePlaceholder = loadingOptions ? 'Loading assignees...' : 'Select assignee';
  const projectPlaceholder = loadingOptions
    ? 'Loading projects...'
    : clientMode
      ? 'Select your project'
      : 'Select project';

  return (
    <>
      <BottomNav />
      <div className="app-container create-task-page">
        <div className="create-task-header">
          <button type="button" className="create-task-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
            <div>
              <h2 style={{ margin: 0 }}>{clientMode ? 'Assign Task' : 'Create Task'}</h2>
              {clientMode && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>
                  Assign work to the team on your projects only
                </p>
              )}
            </div>
          </button>
          <Search size={22} color="#9ca3af" />
        </div>

        <div className="create-task-card card">
          {loadError && (
            <div className="create-task-error">
              {loadError}
              <button type="button" onClick={loadOptions}>
                Retry
              </button>
            </div>
          )}

          <form className="create-task-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{clientMode ? 'What needs to be done?' : 'Task Name'}</label>
              <input
                type="text"
                className="form-input create-task-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={clientMode ? 'Describe the issue or request...' : 'Enter task name...'}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input create-task-input create-task-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={
                  clientMode
                    ? 'Add details, steps to reproduce, or notes for the team...'
                    : 'Add detailed notes about this task...'
                }
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">{clientMode ? 'Assign To Employee' : 'Assigned To'}</label>
              <select
                className="form-input form-select-dark"
                style={selectStyle}
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                required
                disabled={loadingOptions}
              >
                <option value="">{assigneePlaceholder}</option>
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
                size={18}
                style={{ position: 'absolute', right: 4, bottom: 14, pointerEvents: 'none', color: '#6b7280' }}
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">{clientMode ? 'Your Project' : 'Project'}</label>
              <select
                className="form-input form-select-dark"
                style={selectStyle}
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                required
                disabled={loadingOptions}
              >
                <option value="">{projectPlaceholder}</option>
                {projects.map((p) => {
                  const id = getEntityId(p);
                  return (
                    <option key={id} value={id}>
                      {p.name.trim()}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={18}
                style={{ position: 'absolute', right: 4, bottom: 14, pointerEvents: 'none', color: '#6b7280' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              {clientMode ? (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid #ef4444',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  ! High — client assignments are always high priority
                </div>
              ) : (
                <div className="create-task-priority">
                  {(
                    [
                      { key: 'HIGH', label: 'High', selected: { bg: '#fee2e2', border: '#ef4444', color: '#b91c1c' } },
                      { key: 'MEDIUM', label: 'Medium', selected: { bg: '#fef3c7', border: '#f59e0b', color: '#b45309' } },
                      { key: 'LOW', label: 'Low', selected: { bg: '#d1fae5', border: '#10b981', color: '#065f46' } },
                    ] as const
                  ).map((p) => {
                    const active = formData.priority === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p.key })}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: 24,
                          border: active ? `1px solid ${p.selected.border}` : '1px solid #e5e7eb',
                          backgroundColor: active ? p.selected.bg : '#f9fafb',
                          color: active ? p.selected.color : '#6b7280',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {p.key === 'HIGH' && <span style={{ fontWeight: 'bold' }}>! </span>}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{clientMode ? 'Deadline (date & time)' : 'Deadline'}</label>
              <div className="create-task-deadline">
                <Calendar size={20} color="#4b5563" />
                <input
                  type={clientMode ? 'datetime-local' : 'date'}
                  className="form-input create-task-input"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingOptions || !!loadError}
              className="btn btn-primary create-task-submit"
            >
              {submitting
                ? clientMode
                  ? 'Assigning...'
                  : 'Creating...'
                : clientMode
                  ? 'Assign Task'
                  : 'Create Task'}{' '}
              <CheckSquare size={20} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateTask;
