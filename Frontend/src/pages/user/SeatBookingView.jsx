import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLibrarySocket } from '../../hooks/useSocket';

export default function SeatBookingView() {
  const { libraryId } = useParams();
  const navigate = useNavigate();

  const [library, setLibrary] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Library Metadata
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await api.get(`/user/libraries/${libraryId}`);
        setLibrary(res.data.data);
        const shiftData = res.data.data.shifts || [];
        setShifts(shiftData);
        if (shiftData.length > 0) setSelectedShift(shiftData[0]);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch library details');
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, [libraryId]);

  // Fetch Seats whenever Shift Changes
  useEffect(() => {
    if (!selectedShift) return;

    const fetchSeats = async () => {
      try {
        const res = await api.get(`/user/libraries/${libraryId}/seats/availability`, {
          params: {
            shiftId: selectedShift._id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });
        setSeats(res.data.data);
        setSelectedSeat(null);
      } catch (err) {
        console.error('Failed to load seats:', err);
      }
    };
    fetchSeats();
  }, [libraryId, selectedShift]);

  // Real-time seat locking hook
  const handleSeatReserved = useCallback((data) => {
    if (selectedShift && data.shiftId === selectedShift._id) {
      setSeats((prev) =>
        prev.map((s) => (s._id === data.seatId ? { ...s, isAvailable: false } : s))
      );
    }
  }, [selectedShift]);

  useLibrarySocket(libraryId, handleSeatReserved);

  const handleBooking = async () => {
    if (!selectedSeat || !selectedShift) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        libraryId,
        seatId: selectedSeat._id,
        shiftId: selectedShift._id,
        bookingType: 'monthly',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amountPaid: selectedShift.price,
      };

      await api.post('/user/bookings', payload);
      alert('Desk reserved successfully!');
      navigate('/my-passes');
    } catch (err) {
      setError(err.response?.data?.message || 'Reservation conflict. Choose another seat.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading library matrix...</div>;
  if (!library) return <div>Library record unavailable.</div>;

  return (
    <div>
      <h2>{library.name}</h2>
      <p style={{ color: '#64748b' }}>{library.address.street}, {library.address.locality}</p>

      <div style={{ margin: '20px 0' }}>
        <h4>Select Shift</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {shifts.map((s) => (
            <button
              key={s._id}
              onClick={() => setSelectedShift(s)}
              style={{
                padding: '8px 16px',
                border: '1px solid #2563eb',
                background: selectedShift?._id === s._id ? '#2563eb' : '#fff',
                color: selectedShift?._id === s._id ? '#fff' : '#000',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {s.name} ({s.startTime} - {s.endTime}) | ₹{s.price}
            </button>
          ))}
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h4>Seat Inventory ({selectedShift?.name})</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
          {seats.map((seat) => {
            const isSelected = selectedSeat?._id === seat._id;
            return (
              <button
                key={seat._id}
                disabled={!seat.isAvailable}
                onClick={() => setSelectedSeat(seat)}
                style={{
                  padding: '12px 6px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: !seat.isAvailable ? '#e2e8f0' : isSelected ? '#16a34a' : '#fff',
                  color: isSelected ? '#fff' : !seat.isAvailable ? '#94a3b8' : '#000',
                  cursor: seat.isAvailable ? 'pointer' : 'not-allowed',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{seat.seatNumber}</div>
                <div style={{ fontSize: '10px' }}>{seat.type}</div>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        <strong>Selection:</strong> {selectedSeat ? `${selectedSeat.seatNumber} (${selectedSeat.type})` : 'None selected'} |{' '}
        <strong>Total:</strong> ₹{selectedShift?.price || 0}
        <button
          onClick={handleBooking}
          disabled={!selectedSeat || submitting}
          style={{ marginLeft: '16px', padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {submitting ? 'Confirming Lock...' : 'Confirm Reservation'}
        </button>
      </div>
    </div>
  );
}