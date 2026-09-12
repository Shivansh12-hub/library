import React, { useEffect, useState } from 'react';
import api from '../../api/client';

export default function MyPasses() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPasses = async () => {
      try {
        const res = await api.get('/user/bookings/my-bookings');
        setPasses(res.data.data || []);
      } catch (err) {
        console.error('Failed to load passes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPasses();
  }, []);

  return (
    <div>
      <h2>My Active Passes</h2>
      {loading ? (
        <p>Loading passes...</p>
      ) : passes.length === 0 ? (
        <p>No active subscriptions found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {passes.map((booking) => (
            <div key={booking._id} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0' }}>{booking.library?.name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Desk: <strong>{booking.seat?.seatNumber}</strong> | Shift: {booking.shiftId}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Valid: {new Date(booking.startDate).toLocaleDateString()} to {new Date(booking.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Gate Entry Pass Code:</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px', color: '#0f172a' }}>
                    {booking.qrPassCode}
                  </div>
                  <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px' }}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}