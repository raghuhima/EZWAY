import React, { useEffect, useState } from 'react';
import socket from '../utils/socket';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { API_BASE } from '../config';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });

  useEffect(() => {
    // Fetch historical logs
    fetch(`${API_BASE}/api/logs`)
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        const newStats = {
          total: data.length,
          sent: data.filter(l => l.status === 'Sent').length,
          failed: data.filter(l => l.status === 'Failed').length,
          pending: 0
        };
        setStats(newStats);
      });

    socket.on('send_status', (data) => {
      setLogs(prev => [data, ...prev].slice(0, 50));
      setStats(prev => ({
        ...prev,
        sent: data.status === 'Sent' ? prev.sent + 1 : prev.sent,
        failed: data.status === 'Failed' ? prev.failed + 1 : prev.failed,
        total: prev.total + 1
      }));
    });

    socket.on('pending_count', (data) => {
      setStats(prev => ({ ...prev, pending: data.count }));
    });

    socket.on('queue_progress', (data) => {
        // You could update waiting status here
    });

    return () => {
      socket.off('send_status');
      socket.off('pending_count');
      socket.off('queue_progress');
    };
  }, []);

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Analytics Dashboard</h1>

      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={20} className="text-primary" />
            <span className="stat-label">Total Processed</span>
          </div>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} color="var(--success)" />
            <span className="stat-label">Successfully Sent</span>
          </div>
          <span className="stat-value text-success">{stats.sent}</span>
        </div>
        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={20} color="var(--danger)" />
            <span className="stat-label">Failed</span>
          </div>
          <span className="stat-value text-danger">{stats.failed}</span>
        </div>
        <div className="glass-panel stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--warning)" />
            <span className="stat-label">In Queue</span>
          </div>
          <span className="stat-value text-warning">{stats.pending}</span>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Live Activity Log</h3>
        <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', padding: '16px', minHeight: '300px' }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
              No recent activity. Start a campaign to see logs here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${log.status === 'Sent' ? 'var(--success)' : 'var(--danger)'}`
                }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>{log.number}</span>
                    {log.error && <div style={{ fontSize: '12px', color: 'var(--danger)' }}>{log.error}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      background: log.status === 'Sent' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: log.status === 'Sent' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {log.status}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
