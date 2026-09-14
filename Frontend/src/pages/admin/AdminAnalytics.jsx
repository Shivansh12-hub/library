import React, { useState, useEffect } from "react";
import api from "../../api/client";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/admin/analytics");
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleToggleLibrary = async (libraryId) => {
    try {
      await api.patch(`/admin/libraries/${libraryId}/toggle-status`);
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle status");
    }
  };

  if (loading) return <div>Loading platform metrics...</div>;
  if (error) return <div style={{ color: "#ef4444" }}>{error}</div>;

  const { metrics, recentBookings, librariesList } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ margin: 0 }}>Platform Command Center</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
          Real-time metrics, system capacity, and property oversight.
        </p>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        <div style={cardStyle}>
          <span style={labelStyle}>Total Revenue</span>
          <span style={valStyle}>₹{metrics.totalRevenue.toLocaleString()}</span>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Global Occupancy</span>
          <span style={valStyle}>{metrics.globalOccupancyRate}%</span>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Active Desks</span>
          <span style={valStyle}>
            {metrics.activeBookings} / {metrics.totalSeats}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Active Libraries</span>
          <span style={valStyle}>{metrics.totalLibraries}</span>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Total Students</span>
          <span style={valStyle}>{metrics.totalStudents}</span>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Registered Owners</span>
          <span style={valStyle}>{metrics.totalOwners}</span>
        </div>
      </div>

      {/* Recent Bookings Audit */}
      <div style={sectionBoxStyle}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
          Recent Transactions & Reservations
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "8px" }}>Student</th>
              <th style={{ padding: "8px" }}>Library</th>
              <th style={{ padding: "8px" }}>Desk</th>
              <th style={{ padding: "8px" }}>Amount</th>
              <th style={{ padding: "8px" }}>Status</th>
              <th style={{ padding: "8px" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b) => (
              <tr key={b._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px" }}>
                  <strong>{b.user?.name || "Walk-In"}</strong>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{b.user?.phone}</div>
                </td>
                <td style={{ padding: "8px" }}>{b.library?.name}</td>
                <td style={{ padding: "8px", fontWeight: "bold" }}>{b.seat?.seatNumber}</td>
                <td style={{ padding: "8px" }}>₹{b.amountPaid}</td>
                <td style={{ padding: "8px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      background: b.status === "active" ? "#dcfce7" : "#f1f5f9",
                      color: b.status === "active" ? "#166534" : "#475569",
                    }}
                  >
                    {b.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "8px", color: "#64748b" }}>
                  {new Date(b.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Properties Control Table */}
      <div style={sectionBoxStyle}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
          Registered Properties Directory
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {librariesList.map((lib) => (
            <div
              key={lib._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
              }}
            >
              <div>
                <strong>{lib.name}</strong>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {lib.address?.street}, {lib.address?.locality}
                </div>
              </div>
              <button
                onClick={() => handleToggleLibrary(lib._id)}
                style={{
                  padding: "6px 14px",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fca5a5",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Deactivate Property
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: "bold",
  textTransform: "uppercase",
};

const valStyle = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#0f172a",
};

const sectionBoxStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "20px",
};