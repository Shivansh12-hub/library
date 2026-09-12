import React, { useState, useEffect } from 'react';
import api from '../../api/client';

export default function GateQrScanner() {
  const [libraries, setLibraries] = useState([]);
  const [libraryId, setLibraryId] = useState('');
  const [qrPassCode, setQrPassCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const res = await api.get('/owner/libraries');
        const list = res.data.data || [];
        setLibraries(list);
        if (list.length > 0) setLibraryId(list[0]._id);
      } catch (err) {
        console.error('Failed to load libraries:', err);
      }
    };
    fetchLibraries();
  }, []);

  const handleVerify = async (type) => {
    if (!qrPassCode) return;
    try {
      setError(null);
      const res = await api.post(`/owner/libraries/${libraryId}/verify-qr`, { qrPassCode, type });
      setResult(res.data);
      setQrPassCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid, expired, or wrong gate pass');
      setResult(null);
    }
  };

  return (
    <div style={{ maxWidth: '450px' }}>
      <h2>Gate Scanner / Turnstile Verifier</h2>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px' }}>Gate Terminal Location</label>
        <select
          value={libraryId}
          onChange={(e) => setLibraryId(e.target.value)}
          style={{ width: '100%', padding: '8px' }}
        >
          {libraries.map((l) => (
            <option key={l._id} value={l._id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px' }}>Student QR Pass Code</label>
        <input
          placeholder="e.g. A3F82C90"
          value={qrPassCode}
          onChange={(e) => setQrPassCode(e.target.value.toUpperCase())}
          style={{ width: '100%', padding: '8px', fontFamily: 'monospace', textTransform: 'uppercase' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => handleVerify('in')}
          style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Check IN
        </button>
        <button
          onClick={() => handleVerify('out')}
          style={{ flex: 1, padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Check OUT
        </button>
      </div>

      {error && <div style={{ marginTop: '16px', padding: '10px', background: '#fee2e2', color: '#b91c1c' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: '16px', padding: '16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#166534' }}>{result.message}</h4>
          <p style={{ margin: '2px 0' }}>Student: <strong>{result.data.studentName}</strong></p>
          <p style={{ margin: '2px 0' }}>Phone: {result.data.studentPhone}</p>
          <p style={{ margin: '2px 0' }}>Assigned Desk: <strong>{result.data.seatNumber}</strong> ({result.data.seatType})</p>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}>Logged at: {new Date(result.data.timestamp).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}