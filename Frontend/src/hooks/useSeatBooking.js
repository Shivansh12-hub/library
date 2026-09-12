import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useLibrarySocket } from './useSocket';

export const useSeatBooking = (libraryId) => {
  const [library, setLibrary] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState({ loading: false, error: null, success: false });

  // 1. Fetch library metadata & shift tiers
  useEffect(() => {
    if (!libraryId) return;

    const fetchLibrary = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/user/libraries/${libraryId}`);
        setLibrary(res.data.data);
        setShifts(res.data.data.shifts || []);
        if (res.data.data.shifts?.length > 0) {
          setSelectedShift(res.data.data.shifts[0]);
        }
      } catch (err) {
        console.error('Failed to load library:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, [libraryId]);

  // 2. Fetch seats when shift changes
  useEffect(() => {
    if (!libraryId || !selectedShift) return;

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
        setSelectedSeat(null); // Reset selection on shift change
      } catch (err) {
        console.error('Failed to fetch seat map:', err);
      }
    };

    fetchSeats();
  }, [libraryId, selectedShift]);

  // 3. Sync live real-time booking updates via WebSockets
  const handleSeatReserved = useCallback((data) => {
    if (selectedShift && data.shiftId === selectedShift._id) {
      setSeats((prevSeats) =>
        prevSeats.map((seat) =>
          seat._id === data.seatId ? { ...seat, isAvailable: false } : seat
        )
      );
    }
  }, [selectedShift]);

  useLibrarySocket(libraryId, handleSeatReserved);

  // 4. Confirm Reservation
  const confirmBooking = async () => {
    if (!selectedSeat || !selectedShift) return;

    setBookingStatus({ loading: true, error: null, success: false });

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

      const res = await api.post('/user/bookings', payload);
      setBookingStatus({ loading: false, error: null, success: true, booking: res.data.data });
      return res.data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Booking failed';
      setBookingStatus({ loading: false, error: message, success: false });
      throw new Error(message);
    }
  };

  return {
    library,
    shifts,
    selectedShift,
    setSelectedShift,
    seats,
    selectedSeat,
    setSelectedSeat,
    loading,
    bookingStatus,
    confirmBooking
  };
};