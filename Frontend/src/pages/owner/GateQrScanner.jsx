import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../../api/client";

export default function GateQrVerify() {
  const [libraries, setLibraries] = useState([]);
  const [selectedLibId, setSelectedLibId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanType, setScanType] = useState("in");
  const [statusResult, setStatusResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef(null);

  // Load Owner Libraries
  useEffect(() => {
    const loadLibs = async () => {
      try {
        const res = await api.get("/owner/libraries");
        const list = res.data.data || [];
        setLibraries(list);
        if (list.length > 0) setSelectedLibId(list[0]._id);
      } catch (err) {
        console.error("Failed to load libraries:", err);
      }
    };
    loadLibs();
  }, []);

  // Verification request helper
  const handleVerify = async (codeToVerify) => {
    if (!codeToVerify || !selectedLibId) return;

    try {
      const res = await api.post(`/owner/libraries/${selectedLibId}/gate-verify`, {
        qrPassCode: codeToVerify.trim(),
        type: scanType,
      });

      setStatusResult({
        success: true,
        message: res.data.message,
        data: res.data.data,
      });
      setManualCode("");
    } catch (err) {
      setStatusResult({
        success: false,
        message: err.response?.data?.message || "Invalid or expired gate pass",
      });
    }
  };

  // Turn Camera On / Off
  useEffect(() => {
    if (!cameraActive) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        let parsedCode = decodedText;
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.qrPassCode) parsedCode = parsed.qrPassCode;
        } catch {
          // Plain string fallback
        }
        handleVerify(parsedCode);
      },
      () => {}
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [cameraActive, selectedLibId, scanType]);

  return (
    <div style={{ maxWidth: "650px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>Turnstile QR Gate Scanner</h2>
        <select
          value={selectedLibId}
          onChange={(e) => setSelectedLibId(e.target.value)}
          style={{ padding: "8px" }}
        >
          {libraries.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mode Select: Check IN vs Check OUT */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          onClick={() => setScanType("in")}
          style={{
            flex: 1,
            padding: "10px",
            background: scanType === "in" ? "#16a34a" : "#f1f5f9",
            color: scanType === "in" ? "#fff" : "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Check IN Scanner
        </button>
        <button
          onClick={() => setScanType("out")}
          style={{
            flex: 1,
            padding: "10px",
            background: scanType === "out" ? "#dc2626" : "#f1f5f9",
            color: scanType === "out" ? "#fff" : "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Check OUT Scanner
        </button>
      </div>

      {/* Camera Toggle */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setCameraActive((prev) => !prev)}
          style={{
            padding: "8px 16px",
            background: cameraActive ? "#e2e8f0" : "#2563eb",
            color: cameraActive ? "#0f172a" : "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {cameraActive ? "Turn Camera OFF" : "Start Live Webcam Scanner"}
        </button>

        {cameraActive && (
          <div style={{ marginTop: "12px", background: "#000", borderRadius: "8px", overflow: "hidden" }}>
            <div id="reader" />
          </div>
        )}
      </div>

      {/* Manual Input Fallback */}
      <div style={{ padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "6px" }}>
          OR ENTER 16-CHAR PASS CODE MANUALLY:
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="e.g. 7C8BA268D72E1538"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ flex: 1, padding: "8px", fontFamily: "monospace", textTransform: "uppercase" }}
          />
          <button
            onClick={() => handleVerify(manualCode)}
            style={{
              padding: "8px 16px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Verify Pass
          </button>
        </div>
      </div>

      {/* Result Card */}
      {statusResult && (
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid",
            borderColor: statusResult.success ? "#86efac" : "#fca5a5",
            background: statusResult.success ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <h4 style={{ margin: "0 0 6px", color: statusResult.success ? "#166534" : "#991b1b" }}>
            {statusResult.success ? "Gate Access Granted" : "Gate Access Denied"}
          </h4>
          <p style={{ margin: 0, fontSize: "13px", color: statusResult.success ? "#15803d" : "#b91c1c" }}>
            {statusResult.message}
          </p>

          {statusResult.data && (
            <div style={{ marginTop: "10px", fontSize: "13px", color: "#1e293b" }}>
              <div>Student: <strong>{statusResult.data.studentName}</strong> ({statusResult.data.studentPhone})</div>
              <div>Desk: <strong>{statusResult.data.seatNumber}</strong> ({statusResult.data.seatType})</div>
              <div>Turnstile Action: <strong>{scanType.toUpperCase()}</strong></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}