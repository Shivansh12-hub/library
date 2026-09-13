import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useLibrarySocket } from '../../hooks/useSocket';

export default function OwnerLiveFloor() {
  const [libraries, setLibraries] = useState([]);
  const [selectedLibId, setSelectedLibId] = useState('');
  const [gridData, setGridData] = useState([]);
  const [stats, setStats] = useState({ total: 0, occupied: 0 });
  const [loading, setLoading] = useState(false);

  // Selected seat for modal action
  const [activeSeat, setActiveSeat] = useState(null);
  const [targetSeatId, setTargetSeatId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  // Real-time seat updates
  const handleLiveUpdates = useCallback(() => {
    loadOccupancy();
  }, [loadOccupancy]);

  useLibrarySocket(selectedLibId, handleLiveUpdates);

  // Actions
  const handleVacate = async () => {
    if (!window.confirm(`Vacate seat ${activeSeat.seatNumber}? This will end the active pass.`)) return;
    setActionLoading(true);
    try {
      await api.patch(`/owner/libraries/${selectedLibId}/seats/${activeSeat._id}/vacate`);
      setActiveSeat(null);
      loadOccupancy();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to vacate seat');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!targetSeatId) return;
    setActionLoading(true);
    try {
      await api.patch(`/owner/libraries/${selectedLibId}/seats/${activeSeat._id}/transfer`, {
        targetSeatId,
      });
      alert(`Reassigned to target desk successfully!`);
      setActiveSeat(null);
      setTargetSeatId('');
      loadOccupancy();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to transfer desk');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!activeSeat) return;
    setActionLoading(true);
    try {
      const res = await api.patch(
        `/owner/libraries/${selectedLibId}/seats/${activeSeat._id}/maintenance`
      );
      
      const newStatus = res.data.data.isMaintenance;

      // Update local grid immediately
      setGridData((prev) =>
        prev.map((s) => (s._id === activeSeat._id ? { ...s, isMaintenance: newStatus } : s))
      );

      setActiveSeat(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle maintenance");
    } finally {
      setActionLoading(false);
    }
  };

  const vacantSeats = gridData.filter((s) => !s.isOccupied && !s.isMaintenance && s._id !== activeSeat?._id);

  return (
    <div style={{ position: 'relative' }}>
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
              onClick={() => setActiveSeat(seat)}
              style={{
                border: '2px solid',
                borderColor: seat.isMaintenance ? '#94a3b8' : seat.isOccupied ? '#f87171' : '#4ade80',
                background: seat.isMaintenance ? '#f1f5f9' : seat.isOccupied ? '#fef2f2' : '#f0fdf4',
                padding: '10px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'transform 0.1s',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{seat.seatNumber}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{seat.type}</div>
              <div style={{ marginTop: '8px', fontSize: '11px' }}>
                {seat.isMaintenance ? (
                  <strong style={{ color: '#475569' }}>🛠️ Maintenance</strong>
                ) : seat.isOccupied ? (
                  <>
                    <strong style={{ color: '#b91c1c' }}>Occupied</strong>
                    <div>{seat.occupiedBy?.userName || 'Member'}</div>
                    <div style={{ color: '#64748b' }}>{seat.occupiedBy?.userPhone}</div>
                  </>
                ) : (
                  <span style={{ color: '#15803d' }}>Vacant (Click)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seat Management Action Modal */}
      {activeSeat && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Manage Desk: {activeSeat.seatNumber}</h3>
              <button onClick={() => setActiveSeat(null)} style={{ border: 'none', background: 'transparent', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Type: <strong>{activeSeat.type}</strong> | Status:{' '}
              <strong>{activeSeat.isMaintenance ? 'Under Maintenance' : activeSeat.isOccupied ? 'Occupied' : 'Vacant'}</strong>
            </p>

            {activeSeat.isOccupied && (
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                <div>Occupant: <strong>{activeSeat.occupiedBy?.userName}</strong></div>
                <div>Phone: <strong>{activeSeat.occupiedBy?.userPhone}</strong></div>
                <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

                {/* Transfer Desk Form */}
                <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Reassign to Another Desk:</label>
                  <select
                    value={targetSeatId}
                    onChange={(e) => setTargetSeatId(e.target.value)}
                    style={{ padding: '6px', width: '100%' }}
                    required
                  >
                    <option value="">Select target desk...</option>
                    {vacantSeats.map((s) => (
                      <option key={s._id} value={s._id}>{s.seatNumber} ({s.type})</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Transfer Desk
                  </button>
                </form>

                <button
                  onClick={handleVacate}
                  disabled={actionLoading}
                  style={{ marginTop: '12px', width: '100%', padding: '8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Early Checkout (Vacate)
                </button>
              </div>
            )}

            <button
              onClick={handleToggleMaintenance}
              disabled={actionLoading}
              style={{ width: '100%', padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
            >
              {activeSeat.isMaintenance ? 'Clear Maintenance (Mark Available)' : 'Mark as Broken / Maintenance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}