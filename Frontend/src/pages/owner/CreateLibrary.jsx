import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function CreateLibrary() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    street: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    totalSeats: 30,
    seatPrefix: "A",
  });

  const [amenities, setAmenities] = useState(["high_speed_wifi", "ac", "power_backup"]);
  const [shifts, setShifts] = useState([
    { name: "Morning Shift", startTime: "06:00", endTime: "14:00", price: 999 },
    { name: "Evening Shift", startTime: "14:00", endTime: "22:00", price: 999 },
    { name: "Full Day Pass", startTime: "06:00", endTime: "23:00", price: 1699 },
  ]);

  const availableAmenities = [
    { id: "high_speed_wifi", label: "High-Speed Wi-Fi" },
    { id: "ac", label: "Air Conditioning" },
    { id: "power_backup", label: "Power Backup / Generator" },
    { id: "cafeteria", label: "Cafeteria / RO Water" },
    { id: "lockers", label: "Personal Storage Lockers" },
    { id: "silent_zone", label: "Strict Silent Room" },
  ];

  const toggleAmenity = (id) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleShiftChange = (idx, field, val) => {
    const updated = [...shifts];
    updated[idx][field] = field === "price" ? Number(val) : val;
    setShifts(updated);
  };

  const addShiftRow = () => {
    setShifts([...shifts, { name: "Custom Shift", startTime: "08:00", endTime: "16:00", price: 800 }]);
  };

  const removeShiftRow = (idx) => {
    setShifts(shifts.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      description: form.description,
      address: {
        street: form.street,
        locality: form.locality,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      },
      amenities,
      shifts,
      totalSeats: Number(form.totalSeats),
      seatPrefix: form.seatPrefix.toUpperCase().trim() || "S",
    };

    try {
      await api.post("/owner/libraries", payload);
      alert("Property registered and desks auto-generated successfully!");
      navigate("/owner/live-grid");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create library profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ margin: 0 }}>Register New Study Space</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
          Configure physical capacity, shift timings, monthly fees, and amenities.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Basic Info */}
        <div style={boxStyle}>
          <h3 style={sectionHeading}>1. Basic Property Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Library Name</label>
              <input
                required
                style={inputStyle}
                placeholder="e.g. Takshashila Reading Hall"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                rows={2}
                style={inputStyle}
                placeholder="Describe silence rules, ergonomics, and surroundings..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={boxStyle}>
          <h3 style={sectionHeading}>2. Location & Address</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div style={{ gridColumn: "span 3" }}>
              <label style={labelStyle}>Street Address</label>
              <input
                required
                style={inputStyle}
                placeholder="Shop No, Building Name, Street"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Locality / Area</label>
              <input
                required
                style={inputStyle}
                placeholder="e.g. Kalu Sarai"
                value={form.locality}
                onChange={(e) => setForm({ ...form, locality: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input
                required
                style={inputStyle}
                placeholder="e.g. New Delhi"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Pincode</label>
              <input
                required
                style={inputStyle}
                placeholder="110016"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Seat Layout Capacity */}
        <div style={boxStyle}>
          <h3 style={sectionHeading}>3. Seating Capacity & Layout</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Total Desks to Auto-Generate</label>
              <input
                type="number"
                min="1"
                max="200"
                required
                style={inputStyle}
                value={form.totalSeats}
                onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Seat Identifier Prefix</label>
              <input
                maxLength={4}
                required
                style={inputStyle}
                placeholder="e.g. A, S, or DESK"
                value={form.seatPrefix}
                onChange={(e) => setForm({ ...form, seatPrefix: e.target.value })}
              />
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Generates {form.seatPrefix || "S"}-01 through {form.seatPrefix || "S"}-{form.totalSeats}
              </span>
            </div>
          </div>
        </div>

        {/* Amenities Selection */}
        <div style={boxStyle}>
          <h3 style={sectionHeading}>4. Facilities & Amenities</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {availableAmenities.map((am) => {
              const active = amenities.includes(am.id);
              return (
                <button
                  type="button"
                  key={am.id}
                  onClick={() => toggleAmenity(am.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    background: active ? "#eff6ff" : "#fff",
                    color: active ? "#1d4ed8" : "#475569",
                    fontWeight: "500",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {active ? "✓ " : "+ "}
                  {am.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shifts & Pricing Breakdown */}
        <div style={boxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "15px" }}>5. Shifts & Monthly Pricing (INR)</h3>
            <button
              type="button"
              onClick={addShiftRow}
              style={{ fontSize: "12px", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
            >
              + Add Another Shift
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {shifts.map((shift, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  required
                  style={{ ...inputStyle, flex: 2 }}
                  placeholder="Shift Name"
                  value={shift.name}
                  onChange={(e) => handleShiftChange(idx, "name", e.target.value)}
                />
                <input
                  type="time"
                  required
                  style={{ ...inputStyle, flex: 1 }}
                  value={shift.startTime}
                  onChange={(e) => handleShiftChange(idx, "startTime", e.target.value)}
                />
                <span style={{ color: "#64748b" }}>to</span>
                <input
                  type="time"
                  required
                  style={{ ...inputStyle, flex: 1 }}
                  value={shift.endTime}
                  onChange={(e) => handleShiftChange(idx, "endTime", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  required
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Price (₹)"
                  value={shift.price}
                  onChange={(e) => handleShiftChange(idx, "price", e.target.value)}
                />
                {shifts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeShiftRow(idx)}
                    style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "12px 24px",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          {submitting ? "Provisioning Property..." : "Complete Setup & Publish"}
        </button>
      </form>
    </div>
  );
}

const boxStyle = {
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const sectionHeading = {
  margin: "0 0 14px 0",
  fontSize: "15px",
  color: "#0f172a",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#475569",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  fontSize: "13px",
};