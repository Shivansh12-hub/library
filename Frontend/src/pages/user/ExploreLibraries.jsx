import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";

export default function ExploreLibraries() {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const res = await api.get("/user/libraries", { params: { search } });
        setLibraries(res.data.data || []);
      } catch (err) {
        console.error("Failed to load libraries:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibraries();
  }, [search]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>Available Study Libraries</h2>
        <input
          placeholder="Search by city or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", width: "250px" }}
        />
      </div>

      {loading ? (
        <p>Loading branches...</p>
      ) : libraries.length === 0 ? (
        <p>No libraries found matching criteria.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {libraries.map((lib) => (
            <div
              key={lib._id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0" }}>{lib.name}</h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: "0 0 12px 0",
                }}
              >
                {lib.address.locality}, {lib.address.city}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                {lib.amenities.map((a) => (
                  <span
                    key={a}
                    style={{
                      fontSize: "10px",
                      background: "#e0f2fe",
                      color: "#0369a1",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  margin: "0 0 12px 0",
                }}
              >
                Starting ₹{lib.shifts?.[0]?.price || "N/A"}/mo
              </p>
              <Link
                to={`/library/${lib._id}`}
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
              >
                View Details & Amenities
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
