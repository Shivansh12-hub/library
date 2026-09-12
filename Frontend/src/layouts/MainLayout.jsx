import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useActivity } from '../context/ActivityContext';

export default function MainLayout() {
  const { logs } = useActivity();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          background: "#1e293b",
          color: "#fff",
        }}
      >
        <div>
          <strong style={{ fontSize: "18px" }}>DeskPlatform</strong>
          <span
            style={{
              marginLeft: "12px",
              fontSize: "12px",
              background: "#334155",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {user?.role ? user.role.toUpperCase() : "GUEST"}
          </span>
        </div>
        <div>
          {user ? (
            <span>
              {user.name} ({user.phone}) |{" "}
              <button
                onClick={handleLogout}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </span>
          ) : (
            <Link
              to="/login"
              style={{ color: "#38bdf8", textDecoration: "none" }}
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* 3-Column Work Area */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Left Sidebar */}
        <aside
          style={{
            width: "220px",
            background: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            padding: "16px",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px 0",
              fontSize: "12px",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Navigation
          </h4>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <li>
              <Link to="/explore">Explore Libraries</Link>
            </li>
            {user?.role === "user" && (
              <>
                <li>
                  <Link to="/my-passes">My Active Passes</Link>
                </li>
                <li>
                  <Link to="/study-planner">Daily Study Planner</Link>
                </li>
              </>
            )}

            {user?.role === "owner" && (
              <>
                <li
                  style={{
                    marginTop: "16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#64748b",
                  }}
                >
                  OWNER CONTROLS
                </li>
                <li>
                  <Link to="/owner/live-grid">Live Occupancy</Link>
                </li>
                <li>
                  <Link to="/owner/walk-in">Manual Walk-In</Link>
                </li>
                <li>
                  <Link to="/owner/gate-verify">Turnstile QR Verify</Link>
                </li>
              </>
            )}

            {user?.role === "admin" && (
              <>
                <li
                  style={{
                    marginTop: "16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#64748b",
                  }}
                >
                  SUPER ADMIN
                </li>
                <li>
                  <Link to="/admin/analytics">Platform Analytics</Link>
                </li>
              </>
            )}
          </ul>
        </aside>

        {/* Center Dynamic Area */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            background: "#ffffff",
            overflowY: "auto",
          }}
        >
          <Outlet />
        </main>

        {/* Right Info Panel */}
        {/* Right Info Panel: Live Activity Feed */}
<aside style={{ width: '260px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
    <h4 style={{ margin: 0, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Live System Feed</h4>
    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
      ● LIVE
    </span>
  </div>

  <div style={{ marginBottom: '12px', fontSize: '12px', color: '#475569' }}>
    <div>Account: <strong>{user?.name || 'Guest'}</strong></div>
    <div>ID: <span style={{ fontFamily: 'monospace' }}>{user?.id || user?._id || 'N/A'}</span></div>
  </div>

  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 12px 0' }} />

  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {logs.map((item) => (
      <div
        key={item.id}
        style={{
          padding: '8px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          fontSize: '11px',
          lineHeight: '1.4'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>
          <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{item.type}</span>
          <span>{item.time}</span>
        </div>
        <div style={{ color: '#1e293b' }}>{item.message}</div>
      </div>
    ))}
  </div>
</aside>
      </div>
    </div>
  );
}
