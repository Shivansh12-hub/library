import React, { useState, useEffect } from "react";
import api from "../../api/client";

export default function StudyPlanner() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyGoalHours, setDailyGoalHours] = useState(6);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/user/study-stats");
        setStats(res.data.data);
      } catch (err) {
        console.error("Failed to load study analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading study tracker...</div>;

  const totalHours = Number(stats?.totalHours || 0);
  const progressPercent = Math.min(100, Math.round((totalHours / dailyGoalHours) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" }}>
      <div>
        <h2 style={{ margin: 0 }}>Daily Study Planner & Attendance</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
          Logged hours are calculated automatically through entrance turnstile check-ins.
        </p>
      </div>

      {/* Live Status Banner */}
      {stats?.activeSession ? (
        <div style={{ padding: "16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#166534" }}>CURRENTLY STUDYING</div>
            <strong style={{ fontSize: "16px", color: "#15803d" }}>{stats.activeSession.library?.name}</strong>
          </div>
          <span style={{ fontSize: "12px", color: "#166534" }}>
            Checked in at {new Date(stats.activeSession.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      ) : (
        <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", color: "#64748b" }}>
          Currently not clocked into any library. Check in at the entrance to begin logging.
        </div>
      )}

      {/* Target Progress Card */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>GOAL PROGRESS</span>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a" }}>
              {totalHours} hrs / {dailyGoalHours} hrs
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <span>Target:</span>
            <select
              value={dailyGoalHours}
              onChange={(e) => setDailyGoalHours(Number(e.target.value))}
              style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
            >
              {[4, 6, 8, 10, 12].map((hrs) => (
                <option key={hrs} value={hrs}>{hrs} Hours</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%", height: "10px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: progressPercent >= 100 ? "#16a34a" : "#2563eb",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Turnstile History Log */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Attendance & Session History</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "8px" }}>Date</th>
              <th style={{ padding: "8px" }}>Library</th>
              <th style={{ padding: "8px" }}>Check In</th>
              <th style={{ padding: "8px" }}>Check Out</th>
              <th style={{ padding: "8px" }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {stats?.history.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                  No attendance records recorded yet.
                </td>
              </tr>
            ) : (
              stats?.history.map((h) => (
                <tr key={h._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px" }}>{new Date(h.checkInTime).toLocaleDateString()}</td>
                  <td style={{ padding: "8px" }}><strong>{h.library?.name}</strong></td>
                  <td style={{ padding: "8px" }}>
                    {new Date(h.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {h.checkOutTime
                      ? new Date(h.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Active"}
                  </td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>
                    {h.durationMinutes ? `${Math.floor(h.durationMinutes / 60)}h ${h.durationMinutes % 60}m` : "In Progress"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}