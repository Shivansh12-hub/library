import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function StudyScheduler() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tasks, setTasks] = useState([]);
  const [activePass, setActivePass] = useState(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [title, setTitle] = useState('');
  const [timeBlock, setTimeBlock] = useState('08:00 - 10:00');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (date) => {
    try {
      setLoading(true);
      const res = await api.get('/tasks', { params: { date } });
      setTasks(res.data.data || []);
      setActivePass(res.data.activePass);
      setHasAccess(true);
    } catch (err) {
      if (err.response?.status === 403) {
        setHasAccess(false);
      } else {
        console.error('Failed to load tasks:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(selectedDate);
  }, [selectedDate]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await api.post('/tasks', {
        title,
        timeBlock,
        date: selectedDate,
        priority,
      });
      setTasks((prev) => [...prev, res.data.data]);
      setTitle('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding task');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      setTasks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, isCompleted: res.data.data.isCompleted } : t))
      );
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (loading) {
    return <p>Checking active library membership...</p>;
  }

  // Gated Access Screen
  if (!hasAccess) {
    return (
      <div style={{ maxWidth: '550px', margin: '40px auto', textAlign: 'center', padding: '32px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ margin: '0 0 8px 0' }}>Desk Booking Required</h2>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
          The Daily Study Planner is exclusively available for active library members. Reserve a study desk to unlock focus blocks, shift checklists, and streak tracking.
        </p>
        <Link
          to="/explore"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Browse Libraries & Book a Seat
        </Link>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0 }}>Daily Study Planner</h2>
            {activePass && (
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                Active: {activePass.libraryName}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            Plan your shift focus blocks and mark targets complete.
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
      </div>

      {/* Progress Widget */}
      <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
          <span>Daily Completion</span>
          <span>{completedCount} of {tasks.length} Tasks ({progressPercent}%)</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: '#16a34a', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Create Task Form */}
      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          placeholder="e.g. Solve 30 DBMS Questions..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 2, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          required
        />
        <input
          placeholder="Shift Time (e.g. 08:00 - 10:00)"
          value={timeBlock}
          onChange={(e) => setTimeBlock(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="submit"
          style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Add Block
        </button>
      </form>

      {/* Task List */}
      <div>
        {tasks.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '14px' }}>No targets logged for this date. Add one above to begin.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task) => (
              <div
                key={task._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: task.isCompleted ? '#f1f5f9' : '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  opacity: task.isCompleted ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => handleToggle(task._id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ textDecoration: task.isCompleted ? 'line-through' : 'none', fontWeight: 500 }}>
                      {task.title}
                    </div>
                    {task.timeBlock && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        🕒 {task.timeBlock}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background:
                        task.priority === 'high'
                          ? '#fee2e2'
                          : task.priority === 'medium'
                          ? '#fef3c7'
                          : '#e0f2fe',
                      color:
                        task.priority === 'high'
                          ? '#b91c1c'
                          : task.priority === 'medium'
                          ? '#92400e'
                          : '#0369a1',
                    }}
                  >
                    {task.priority}
                  </span>
                  <button
                    onClick={() => handleDelete(task._id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}