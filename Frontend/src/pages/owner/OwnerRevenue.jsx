import React, { useState, useEffect } from "react";
import api from "../../api/client";

export default function OwnerRevenue() {
  const [libraries, setLibraries] = useState([]);
  const [selectedLibId, setSelectedLibId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const res = await api.get("/owner/libraries");
        const list = res.data.data || [];
        setLibraries(list);
        if (list.length > 0) setSelectedLibId(list[0]._id);
      } catch (err) {
        console.error("Failed to load libraries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibraries();
  }, []);

  const fetchRevenue = async (libId) => {
    if (!libId) return;
    try {
      const res = await api.get(`/owner/libraries/${libId}/revenue`);
      setReport(res.data.data);
    } catch (err) {
      console.error("Failed to load revenue data:", err);
    }
  };

  useEffect(() => {
    if (selectedLibId) fetchRevenue(selectedLibId);
  }, [selectedLibId]);

  const handleDownloadCSV = () => {
    if (!selectedLibId) return;
    const token = localStorage.getItem("token");
    const baseURL = api.defaults.baseURL || "http://localhost:5000/api/v1";
    window.open(`${baseURL}/owner/libraries/${selectedLibId}/revenue?format=csv&token=${token}`, "_blank");
  };

  if (loading) return <div>Loading account ledger...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Financial Ledger & Revenue</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
            Track total cash/UPI collections and export audit spreadsheets.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={selectedLibId}
            onChange={(e) => setSelectedLibId(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          >
            {libraries.map((lib) => (
              <option key={lib._id} value={lib._id}>
                {lib.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadCSV}
            style={{
              padding: "8px 16px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Total Collected</span>
            <span style={valStyle}>₹{report.metrics.totalCollected.toLocaleString()}</span>
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>Paid Bookings</span>
            <span style={valStyle}>{report.metrics.totalBookings}</span>
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>Manual Walk-Ins</span>
            <span style={valStyle}>{report.metrics.walkInCount}</span>
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>Online Passes</span>
            <span style={valStyle}>{report.metrics.onlineCount}</span>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Transaction History</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "8px" }}>Date</th>
              <th style={{ padding: "8px" }}>Student</th>
              <th style={{ padding: "8px" }}>Desk</th>
              <th style={{ padding: "8px" }}>Type</th>
              <th style={{ padding: "8px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {report?.transactions.map((t) => (
              <tr key={t._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px" }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "8px" }}>
                  <strong>{t.user?.name || "Walk-In"}</strong>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{t.user?.phone}</div>
                </td>
                <td style={{ padding: "8px", fontWeight: "bold" }}>{t.seat?.seatNumber || "—"}</td>
                <td style={{ padding: "8px", textTransform: "capitalize" }}>{t.bookingType}</td>
                <td style={{ padding: "8px", fontWeight: "bold", color: "#16a34a" }}>₹{t.amountPaid}</td>
              </tr>
            ))}
          </tbody>
        </table>
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