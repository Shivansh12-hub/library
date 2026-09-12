import React, { useEffect, useState } from 'react';
import api from '../../api/client';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading platform KPIs...</div>;
  if (!stats) return <div>Failed to load administrative analytics.</div>;

  return (
    <div>
      <h2>Platform Metrics & KPIs</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
        <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active Students</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.usersCount}</div>
        </div>
        <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Library Owners</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.ownersCount}</div>
        </div>
        <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Registered Branches</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.librariesCount}</div>
        </div>
        <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Bookings Completed</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.completedBookings}</div>
        </div>
        <div style={{ padding: '16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#166534' }}>Gross Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>₹{stats.totalGrossRevenue}</div>
        </div>
        <div style={{ padding: '16px', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#0369a1' }}>Platform Cut (10%)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7' }}>₹{stats.estimatedPlatformCut}</div>
        </div>
      </div>
    </div>
  );
}