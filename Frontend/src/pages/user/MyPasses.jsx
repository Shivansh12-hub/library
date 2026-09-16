import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function MyPasses() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState(null);
  const [relocatingPass, setRelocatingPass] = useState(null);
  const [availableSeats, setAvailableSeats] = useState([]);
  const [selectedTargetSeat, setSelectedTargetSeat] = useState("");
  const [relocatingLoading, setRelocatingLoading] = useState(false);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/my-bookings");
      setPasses(res.data.data || []);
    } catch (err) {
      console.error("Failed to load passes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleRenew = async (bookingId) => {
    if (!window.confirm("Renew this pass for an additional 30 days?")) return;
    try {
      await api.post("/user/bookings/renew", { bookingId });
      alert("Pass renewed successfully!");
      fetchPasses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to renew pass");
    }
  };

 const openRelocateModal = async (pass) => {
    setRelocatingPass(pass);
    setSelectedTargetSeat("");
    try {
      const libId = pass.library?._id || pass.library;
      const res = await api.get(`/user/libraries/${libId}/available-seats`, {
        params: {
          shiftId: pass.shiftId,
          startDate: pass.startDate,
          endDate: pass.endDate,
        },
      });

      // Filter out the current seat and non-vacant seats
      const currentSeatId = pass.seat?._id || pass.seat;
      const openSeats = (res.data.data || []).filter(
        (s) => s.isAvailable && s._id !== currentSeatId
      );
      setAvailableSeats(openSeats);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load open desks for relocation");
    }
  };

  const handleExecuteRelocate = async () => {
    if (!selectedTargetSeat) return alert("Please select a target desk");
    setRelocatingLoading(true);
    try {
      await api.patch("/user/bookings/relocate", {
        bookingId: relocatingPass._id,
        targetSeatId: selectedTargetSeat,
      });
      alert("Desk reassigned successfully!");
      setRelocatingPass(null);
      fetchPasses();
    } catch (err) {
      alert(err.response?.data?.message || "Relocation failed");
    } finally {
      setRelocatingLoading(false);
    }
  };

  if (loading) return <div>Loading active passes...</div>;

  return (
    <div style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ margin: 0 }}>My Active Library Passes</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
          Present your QR pass at the entrance scanner to check in or out.
        </p>
      </div>

      {passes.length === 0 ? (
        <div style={{ padding: "30px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <p style={{ color: "#64748b", margin: 0 }}>No active passes found. Explore libraries to book a desk!</p>
        </div>
      ) : (
        passes.map((pass) => (
          <div
            key={pass._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <strong style={{ fontSize: "18px" }}>{pass.library?.name}</strong>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    background: pass.status === "active" ? "#dcfce7" : "#fee2e2",
                    color: pass.status === "active" ? "#166534" : "#991b1b",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {pass.status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: "14px", color: "#334155", marginBottom: "4px" }}>
                Assigned Desk: <strong>{pass.seat?.seatNumber}</strong> ({pass.seat?.type || "Standard"})
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Valid: {new Date(pass.startDate).toLocaleDateString()} – {new Date(pass.endDate).toLocaleDateString()}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  onClick={() => setSelectedPass(pass)}
                  style={{
                    padding: "8px 14px",
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  View QR Gate Pass
                </button>

                <button
                  onClick={() => handleRenew(pass._id)}
                  style={{
                    padding: "8px 14px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  Renew (+30 Days)
                </button>

                <button
                  onClick={() => openRelocateModal(pass)}
                  style={{
                    padding: "8px 14px",
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  Swap Desk
                </button>
              </div>
            </div>

            {/* QR Preview Thumbnail */}
            <div style={{ textAlign: "center" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${pass.qrPassCode}`}
                alt="QR Pass"
                style={{ borderRadius: "6px", border: "1px solid #e2e8f0" }}
              />
              <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                {pass.qrPassCode}
              </div>
            </div>
          </div>
        ))
      )}

      {/* 1. View & Print Gate Pass Modal */}
      {selectedPass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              width: "360px",
              textAlign: "center",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
              Official Turnstile Gate Pass
            </div>
            <h2 style={{ margin: "4px 0 16px 0", fontSize: "20px" }}>{selectedPass.library?.name}</h2>

            <div style={{ display: "inline-block", padding: "12px", border: "2px dashed #cbd5e1", borderRadius: "8px" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${selectedPass.qrPassCode}`}
                alt="Gate Turnstile QR"
                style={{ display: "block" }}
              />
              <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: "bold", marginTop: "8px" }}>
                {selectedPass.qrPassCode}
              </div>
            </div>

            <div style={{ margin: "16px 0", textAlign: "left", fontSize: "13px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Assigned Desk:</span>
                <strong>Desk {selectedPass.seat?.seatNumber}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Valid From:</span>
                <span>{new Date(selectedPass.startDate).toLocaleDateString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Expires:</span>
                <span style={{ color: "#dc2626", fontWeight: "bold" }}>
                  {new Date(selectedPass.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setSelectedPass(null)}
                style={{
                  padding: "10px 16px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Swap / Relocate Desk Modal */}
      {relocatingPass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ background: "#fff", padding: "24px", borderRadius: "10px", width: "380px" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>Relocate Your Desk</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
              Currently assigned: <strong>Desk {relocatingPass.seat?.seatNumber}</strong>
            </p>

            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>
              Select an Available Desk:
            </label>

            {availableSeats.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#ef4444" }}>
                No alternative desks are currently vacant in this shift.
              </p>
            ) : (
              <select
                value={selectedTargetSeat}
                onChange={(e) => setSelectedTargetSeat(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", marginBottom: "16px" }}
              >
                <option value="">-- Choose New Desk --</option>
                {availableSeats.map((s) => (
                  <option key={s._id} value={s._id}>
                    Desk {s.seatNumber} ({s.type} {s.hasSocket ? "⚡" : ""})
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setRelocatingPass(null)}
                style={{ padding: "8px 14px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRelocate}
                disabled={relocatingLoading || !selectedTargetSeat}
                style={{
                  padding: "8px 16px",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {relocatingLoading ? "Reassigning..." : "Confirm Move"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}