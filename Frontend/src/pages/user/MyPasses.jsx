import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../../api/client";

export default function MyPasses() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQrModal, setActiveQrModal] = useState(null);

  const fetchPasses = async () => {
    try {
      const res = await api.get("/user/bookings");
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
    try {
      await api.post("/user/bookings/renew", { bookingId });
      alert("Pass renewed successfully for 30 days!");
      fetchPasses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to renew pass");
    }
  };

  if (loading) return <p>Loading active passes...</p>;

  return (
    <div style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ margin: 0 }}>My Active Library Passes</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
          Present your QR pass at the entrance scanner to check in or out.
        </p>
      </div>

      {passes.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
          No active or past bookings found.
        </div>
      ) : (
        passes.map((pass) => {
          const isExpired = new Date(pass.endDate) < new Date();
          const qrPayload = JSON.stringify({
            qrPassCode: pass.qrPassCode,
            bookingId: pass._id,
          });

          return (
            <div
              key={pass._id}
              style={{
                padding: "20px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h3 style={{ margin: 0 }}>{pass.library?.name}</h3>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      background: isExpired ? "#fee2e2" : "#dcfce7",
                      color: isExpired ? "#b91c1c" : "#166534",
                    }}
                  >
                    {isExpired ? "EXPIRED" : "ACTIVE PASS"}
                  </span>
                </div>

                <div style={{ fontSize: "14px", color: "#334155", marginBottom: "4px" }}>
                  Assigned Desk: <strong>{pass.seat?.seatNumber}</strong> ({pass.seat?.type})
                </div>

                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  Valid: {new Date(pass.startDate).toLocaleDateString()} – {new Date(pass.endDate).toLocaleDateString()}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setActiveQrModal(pass)}
                    style={{
                      padding: "6px 14px",
                      background: "#0f172a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    View QR Gate Pass
                  </button>

                  <button
                    onClick={() => handleRenew(pass._id)}
                    style={{
                      padding: "6px 14px",
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    Renew (+30 Days)
                  </button>
                </div>
              </div>

              {/* Compact Scannable QR Code */}
              <div
                onClick={() => setActiveQrModal(pass)}
                style={{
                  background: "#f8fafc",
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <QRCodeSVG value={qrPayload} size={84} level="M" />
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
                  {pass.qrPassCode}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Enlarged QR Modal */}
      {activeQrModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              textAlign: "center",
              width: "320px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 4px" }}>{activeQrModal.library?.name}</h3>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "13px" }}>
              Desk <strong>{activeQrModal.seat?.seatNumber}</strong> Gate Pass
            </p>

            <div style={{ display: "inline-block", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <QRCodeSVG
                value={JSON.stringify({
                  qrPassCode: activeQrModal.qrPassCode,
                  bookingId: activeQrModal._id,
                })}
                size={200}
                level="H"
              />
            </div>

            <div style={{ marginTop: "12px", fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", color: "#0f172a" }}>
              {activeQrModal.qrPassCode}
            </div>

            <button
              onClick={() => setActiveQrModal(null)}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "8px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}