import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useLibrarySocket } from '../../hooks/useSocket';

export default function OwnerLiveFloor() {
  const [libraries, setLibraries] = useState([]);
  const [selectedLibId, setSelectedLibId] = useState('');
  const [gridData, setGridData] = useState([]);
  const [stats, setStats] = useState({ total: 0, occupied: 0 });
  const [loading, setLoading] = useState(false);

  // Load Owner's Libraries
  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const res = await api.get('/owner/libraries');
        const list = res.data.data || [];
        setLibraries(list);
        if (list.length > 0) setSelectedLibId(list[0]._id);
      } catch (err) {
        console.error('Failed to load properties:', err);
      }
    };
    fetchLibraries();
  }, []);

  // Fetch Occupancy Grid
  const loadOccupancy = useCallback(async () => {
    if (!selectedLibId) return;
    setLoading(true);
    try {
      const res = await api.get(`/owner/libraries/${selectedLibId}/occupancy`);
      setGridData(res.data.data || []);
      setStats({ total: res.data.totalSeats, occupied: res.data.occupiedCount });
    } catch (err) {
      console.error('Failed to fetch occupancy:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLibId]);

  useEffect(() => {
    loadOccupancy();
  }, [loadOccupancy]);

  // Real-time occupant syncing
  const handleLiveSeatSync = useCallback((data) => {
    setGridData((prev) =>
      prev.map((s) =>
        s._id === data.seatId
          ? { ...s, isOccupied: true, occupiedBy: data.bookedBy }
          : s
      )
    );
    setStats((prev) => ({ ...prev, occupied: prev.occupied + 1 }));
  }, []);

  useLibrarySocket(selectedLibId, handleLiveSeatSync);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Live Occupancy Floor Plan</h2>
        <select
          value={selectedLibId}
          onChange={(e) => setSelectedLibId(e.target.value)}
          style={{ padding: '8px' }}
        >
          {libraries.map((lib) => (
            <option key={lib._id} value={lib._id}>{lib.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ padding: '12px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          Total Desks: <strong>{stats.total}</strong>
        </div>
        <div style={{ padding: '12px 20px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px' }}>
          Occupied: <strong>{stats.occupied}</strong>
        </div>
        <div style={{ padding: '12px 20px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px' }}>
          Available: <strong>{stats.total - stats.occupied}</strong>
        </div>
      </div>

      {loading ? (
        <p>Loading layout...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          {gridData.map((seat) => (
            <div
              key={seat._id}
              style={{
                border: '1px solid',
                borderColor: seat.isOccupied ? '#f87171' : '#4ade80',
                background: seat.isOccupied ? '#fef2f2' : '#f0fdf4',
                padding: '10px',
                borderRadius: '6px'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{seat.seatNumber}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{seat.type}</div>
              <div style={{ marginTop: '8px', fontSize: '11px' }}>
                {seat.isOccupied ? (
                  <>
                    <strong style={{ color: '#b91c1c' }}>Occupied</strong>
                    <div>{seat.occupiedBy?.userName || 'Walk-in'}</div>
                    <div style={{ color: '#64748b' }}>{seat.occupiedBy?.userPhone}</div>
                  </>
                ) : (
                  <span style={{ color: '#15803d' }}>Vacant</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}