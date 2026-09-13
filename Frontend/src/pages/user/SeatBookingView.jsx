import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function SeatBookingView() {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [library, setLibrary] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);

  // Seat hold state
  const [heldSeats, setHeldSeats] = useState({}); // { [seatId]: expiresAt }
  const [holdTimerSeconds, setHoldTimerSeconds] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  // 1. Initialize Socket Connection & Listeners
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.emit("join_library", libraryId);

    // Initial holds on room join
    socketRef.current.on("initial_holds", (holds) => {
      const holdMap = {};
      holds.forEach((h) => {
        holdMap[h.seatId] = h.expiresAt;
      });
      setHeldSeats(holdMap);
    });

    // Seat held by another student
    socketRef.current.on("seat_held", ({ seatId, expiresAt }) => {
      setHeldSeats((prev) => ({ ...prev, [seatId]: expiresAt }));
    });

    // Hold released
    socketRef.current.on("seat_released", ({ seatId }) => {
      setHeldSeats((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
    });

    // Confirmation of hold from server
    socketRef.current.on("hold_confirmed", ({ expiresAt }) => {
      const remainingSecs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setHoldTimerSeconds(remainingSecs);
    });

    socketRef.current.on("hold_rejected", ({ message }) => {
      alert(message);
      setSelectedSeat(null);
      setHoldTimerSeconds(null);
    });

    // Real-time confirmed reservation
    socketRef.current.on("seat_reserved", (data) => {
      setSeats((prev) =>
        prev.map((s) => (s._id === data.seatId ? { ...s, isAvailable: false } : s))
      );
      setHeldSeats((prev) => {
        const next = { ...prev };
        delete next[data.seatId];
        return next;
      });
    });


    socketRef.current.on("seat_maintenance_toggled", ({ seatId, isMaintenance }) => {
      setSeats((prev) =>
        prev.map((s) =>
          s._id === seatId
            ? { ...s, isMaintenance, isAvailable: isMaintenance ? false : s.isAvailable }
            : s
        )
      );
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [libraryId]);

  // 2. Countdown Clock Logic
  useEffect(() => {
    if (holdTimerSeconds === null) return;

    if (holdTimerSeconds <= 0) {
      alert("Your 5-minute seat hold expired. Please reselect your desk.");
      if (selectedSeat && socketRef.current) {
        socketRef.current.emit("release_seat", {
          libraryId,
          shiftId: selectedShift?._id,
          seatId: selectedSeat._id,
        });
      }
      setSelectedSeat(null);
      setHoldTimerSeconds(null);
      return;
    }

    const interval = setInterval(() => {
      setHoldTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [holdTimerSeconds, selectedSeat, libraryId, selectedShift]);

  // 3. Fetch Library Metadata
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await api.get(`/user/libraries/${libraryId}`);
        setLibrary(res.data.data);
        const shiftData = res.data.data.shifts || [];
        setShifts(shiftData);
        if (shiftData.length > 0) setSelectedShift(shiftData[0]);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch library details");
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, [libraryId]);

  // 4. Fetch Seats when Shift changes
  const fetchSeats = useCallback(async () => {
    if (!selectedShift) return;

    try {
      const res = await api.get(
        `/user/libraries/${libraryId}/seats/availability`,
        {
          params: {
            shiftId: selectedShift._id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      );
      setSeats(res.data.data || []);
      setSelectedSeat(null);
      setHoldTimerSeconds(null);
    } catch (err) {
      console.error("Failed to load seats:", err);
    }
  }, [libraryId, selectedShift]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // 5. Desk Selection with 5-Minute Hold
  const handleSelectSeat = (seat) => {
    if (!seat.isAvailable || seat.isMaintenance) return;

    // Release if re-clicking current selection
    if (selectedSeat?._id === seat._id) {
      socketRef.current?.emit("release_seat", {
        libraryId,
        shiftId: selectedShift._id,
        seatId: seat._id,
      });
      setSelectedSeat(null);
      setHoldTimerSeconds(null);
      return;
    }

    
    // Release prior seat if picking a new one
    if (selectedSeat) {
      socketRef.current?.emit("release_seat", {
        libraryId,
        shiftId: selectedShift._id,
        seatId: selectedSeat._id,
      });
    }

    setSelectedSeat(seat);
    setHoldTimerSeconds(300); // 5 minutes immediate fallback

    socketRef.current?.emit("hold_seat", {
      libraryId,
      shiftId: selectedShift._id,
      seatId: seat._id,
      seatNumber: seat.seatNumber,
      user,
    });
  };

  // 6. Complete Booking
  const handleBooking = async () => {
    if (!selectedSeat || !selectedShift) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        libraryId,
        seatId: selectedSeat._id,
        shiftId: selectedShift._id,
        bookingType: "monthly",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amountPaid: selectedShift.price,
      };

      await api.post("/user/bookings", payload);
      alert("Desk reserved successfully!");
      navigate("/my-passes");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Reservation conflict. Choose another seat."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) return <div>Loading library matrix...</div>;
  if (!library) return <div>Library record unavailable.</div>;

  return (
    <div>
      {/* Header Bar with Countdown */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>{library.name}</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>
            {library.address?.street}, {library.address?.locality}
          </p>
        </div>

        {holdTimerSeconds !== null && (
          <div
            style={{
              padding: "8px 16px",
              background: "#fef3c7",
              border: "2px solid #f59e0b",
              borderRadius: "8px",
              textAlign: "right",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#92400e", fontWeight: "bold", display: "block" }}>
              SEAT RESERVED TEMPORARILY
            </span>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#b45309", fontFamily: "monospace" }}>
              ⏱️ {formatTimer(holdTimerSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Shifts */}
      <div style={{ margin: "20px 0" }}>
        <h4>Select Shift</h4>
        <div style={{ display: "flex", gap: "8px" }}>
          {shifts.map((s) => (
            <button
              key={s._id}
              onClick={() => {
                setSelectedShift(s);
                setSelectedSeat(null);
                setHoldTimerSeconds(null);
              }}
              style={{
                padding: "8px 16px",
                border: "1px solid #2563eb",
                background: selectedShift?._id === s._id ? "#2563eb" : "#fff",
                color: selectedShift?._id === s._id ? "#fff" : "#000",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {s.name} ({s.startTime} - {s.endTime}) | ₹{s.price}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", fontSize: "12px", margin: "10px 0" }}>
        <span><span style={{ display: "inline-block", width: "12px", height: "12px", background: "#fff", border: "1px solid #cbd5e1", marginRight: "4px" }} /> Vacant</span>
        <span><span style={{ display: "inline-block", width: "12px", height: "12px", background: "#16a34a", marginRight: "4px" }} /> Selected</span>
        <span><span style={{ display: "inline-block", width: "12px", height: "12px", background: "#fde047", marginRight: "4px" }} /> Held by Another (5m)</span>
        <span><span style={{ display: "inline-block", width: "12px", height: "12px", background: "#e2e8f0", marginRight: "4px" }} /> Occupied</span>
        <span><span style={{ display: "inline-block", width: "12px", height: "12px", background: "#f1f5f9", border: "1px solid #cbd5e1", marginRight: "4px" }} /> Maintenance</span>
      </div>

      {/* Seat Grid */}
      <div style={{ margin: "20px 0" }}>
        <h4>Seat Inventory ({selectedShift?.name})</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(85px, 1fr))",
            gap: "10px",
          }}
        >
          {seats.map((seat) => {
            const isSelected = selectedSeat?._id === seat._id;
            const isHeldByOther = Boolean(heldSeats[seat._id] && !isSelected);
            const isOccupied = !seat.isAvailable;
            const isMaint = Boolean(seat.isMaintenance);

            let bg = "#fff";
            let color = "#000";
            let cursor = "pointer";

            if (isSelected) {
              bg = "#16a34a";
              color = "#fff";
            } else if (isHeldByOther) {
              bg = "#fde047";
              color = "#78350f";
              cursor = "not-allowed";
            } else if (isOccupied) {
              bg = "#e2e8f0";
              color = "#94a3b8";
              cursor = "not-allowed";
            } else if (isMaint) {
              bg = "#f1f5f9";
              color = "#64748b";
              cursor = "not-allowed";
            }

            return (
              <button
                key={seat._id}
                disabled={isOccupied || isMaint || isHeldByOther}
                onClick={() => handleSelectSeat(seat)}
                style={{
                  padding: "12px 6px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: bg,
                  color,
                  cursor,
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: "bold" }}>{seat.seatNumber}</div>
                <div style={{ fontSize: "10px" }}>
                  {isMaint ? "Broken 🛠️" : isHeldByOther ? "In Cart ⏱️" : seat.type}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      {/* Checkout Bar */}
      <div
        style={{
          padding: "16px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong>Selection:</strong>{" "}
          {selectedSeat
            ? `${selectedSeat.seatNumber} (${selectedSeat.type})`
            : "None selected"}{" "}
          | <strong>Total:</strong> ₹{selectedShift?.price || 0}
        </div>
        <button
          onClick={handleBooking}
          disabled={!selectedSeat || submitting}
          style={{
            padding: "10px 24px",
            background: selectedSeat ? "#2563eb" : "#94a3b8",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: selectedSeat ? "pointer" : "not-allowed",
            fontWeight: "bold",
          }}
        >
          {submitting ? "Confirming Reservation..." : "Confirm & Complete Payment"}
        </button>
      </div>
    </div>
  );
}