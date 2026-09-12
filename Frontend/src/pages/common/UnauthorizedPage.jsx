import React from 'react';
import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>403 - Unauthorized Access</h2>
      <p>Your current account role does not have permission to view this resource.</p>
      <Link to="/explore">Return to Discovery</Link>
    </div>
  );
}