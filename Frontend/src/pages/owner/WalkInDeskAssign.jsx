import React, { useState, useEffect } from 'react';
import api from '../../api/client';

export default function WalkInDeskAssign() {
  const [libraries, setLibraries] = useState([]);
  const [selectedLib, setSelectedLib] = useState(null);
  const [seats, setSeats] = useState([]);
  const [formData, setFormData] = useState({
    seatId: '',
    shiftId: '',
    userName: '',
    userPhone: '',
    amountPaid: 900,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const res = await api.get('/owner/libraries');
        const list = res.data.data || [];
        setLibraries(list);
        if (list.length > 0) {
          setSelectedLib(list[0]);
          if (list[0].shifts?.[0]) {
            setFormData((prev) => ({ ...prev, shiftId: list[0].shifts[0]._id, amountPaid: list[0].shifts[0].price }));
          }
        }
      } catch (err) {
        console.error('Failed to load libraries:', err);
      }
    };
    fetchLibraries();
  }, []);

  useEffect(() => {
    if (!selectedLib || !formData.shiftId) return;
    const fetchSeats = async () => {
      try {
        const res = await api.get(`/user/libraries/${selectedLib._id}/seats/availability`, {
          params: {
            shiftId: formData.shiftId,
            startDate: new Date(formData.startDate).toISOString(),
            endDate: new Date(formData.endDate).toISOString(),
          }
        });
        setSeats(res.data.data.filter((s) => s.isAvailable));
      } catch (err) {
        console.error('Failed to fetch available seats:', err);
      }
    };
    fetchSeats();
  }, [selectedLib, formData.shiftId, formData.startDate, formData.endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const res = await api.post(`/owner/libraries/${selectedLib._id}/walk-in`, {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      });
      setMessage(`Walk-in recorded! Pass Code: ${res.data.data.qrPassCode}`);
      setFormData((prev) => ({ ...prev, userName: '', userPhone: '', seatId: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Assignment failed');
    }
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h2>Assign Walk-In Student</h2>
      {message && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', marginBottom: '12px' }}>{message}</div>}
      {error && <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', marginBottom: '12px' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px' }}>Property</label>
          <select
            value={selectedLib?._id || ''}
            onChange={(e) => setSelectedLib(libraries.find((l) => l._id === e.target.value))}
            style={{ width: '100%', padding: '8px' }}
          >
            {libraries.map((l) => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px' }}>Shift</label>
          <select
            value={formData.shiftId}
            onChange={(e) => {
              const shift = selectedLib.shifts.find((s) => s._id === e.target.value);
              setFormData((prev) => ({ ...prev, shiftId: e.target.value, amountPaid: shift ? shift.price : prev.amountPaid }));
            }}
            style={{ width: '100%', padding: '8px' }}
          >
            {selectedLib?.shifts?.map((s) => (
              <option key={s._id} value={s._id}>{s.name} (₹{s.price})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px' }}>Available Desk</label>
          <select
            value={formData.seatId}
            onChange={(e) => setFormData((prev) => ({ ...prev, seatId: e.target.value }))}
            required
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">Select Desk...</option>
            {seats.map((seat) => (
              <option key={seat._id} value={seat._id}>{seat.seatNumber} ({seat.type})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px' }}>Student Name</label>
          <input
            value={formData.userName}
            onChange={(e) => setFormData((prev) => ({ ...prev, userName: e.target.value }))}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px' }}>10-Digit Mobile</label>
          <input
            value={formData.userPhone}
            onChange={(e) => setFormData((prev) => ({ ...prev, userPhone: e.target.value }))}
            pattern="[0-9]{10}"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px' }}>Amount Collected (₹)</label>
          <input
            type="number"
            value={formData.amountPaid}
            onChange={(e) => setFormData((prev) => ({ ...prev, amountPaid: Number(e.target.value) }))}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button
          type="submit"
          style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Assign Seat & Issue Pass
        </button>
      </form>
    </div>
  );
}