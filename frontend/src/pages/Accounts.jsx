import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import socket from '../utils/socket';
import { Smartphone, CheckCircle, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { API_BASE } from '../config';

const Accounts = () => {
  const [status, setStatus] = useState('DISCONNECTED');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [activeTab, setActiveTab] = useState('web'); // 'web' or 'meta'

  const fetchStatus = () => {
    fetch(`${API_BASE}/api/status`)
      .then(res => res.json())
      .then(data => {
        setStatus(data.status);
        if (data.qr) {
          QRCode.toDataURL(data.qr, { margin: 1, width: 256, color: { dark: '#000', light: '#fff' } })
            .then(url => setQrCodeUrl(url));
        }
      });
  };

  useEffect(() => {
    fetchStatus();

    socket.on('status', (data) => {
      setStatus(data.status);
    });

    socket.on('qr', (qrString) => {
      QRCode.toDataURL(qrString, { margin: 1, width: 256, color: { dark: '#000', light: '#fff' } })
        .then(url => setQrCodeUrl(url));
    });

    return () => {
      socket.off('status');
      socket.off('qr');
    };
  }, []);

  const handleConnect = () => {
    fetch(`${API_BASE}/api/start`, { method: 'POST' });
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      fetch(`${API_BASE}/api/logout`, { method: 'POST' })
        .then(() => fetchStatus());
    }
  };


  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Accounts & Connection</h1>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'web' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('web')}
        >
          WhatsApp Web (QR)
        </button>
        <button 
          className={`btn ${activeTab === 'meta' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('meta')}
        >
          Official Meta API
        </button>
      </div>

      {activeTab === 'web' ? (
        <div className="glass-panel" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Smartphone size={24} className="text-primary" />
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>WhatsApp Web Session</h2>
        </div>

        <div style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', textAlign: 'center' }}>
          {status === 'CONNECTED' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <CheckCircle size={48} color="var(--success)" />
              <h3 style={{ fontSize: '18px', color: 'var(--success)' }}>Account Connected</h3>
              <p style={{ color: 'var(--text-muted)' }}>Your session is active and ready to send messages.</p>
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={handleLogout}
              >
                <LogOut size={16} /> Logout Account
              </button>
            </div>
          )}

          {status === 'QR_READY' && qrCodeUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <h3 style={{ fontSize: '18px' }}>Scan QR Code</h3>
              <p style={{ color: 'var(--text-muted)' }}>Open WhatsApp on your phone and link a device.</p>
              <div style={{ padding: '10px', background: 'white', borderRadius: '12px' }}>
                <img src={qrCodeUrl} alt="QR Code" width={200} height={200} />
              </div>
            </div>
          )}

          {status === 'INITIALIZING' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Loader2 size={48} className="animate-spin" color="var(--primary)" />
              <h3 style={{ fontSize: '18px' }}>Initializing Session...</h3>
            </div>
          )}

          {status === 'DISCONNECTED' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <AlertTriangle size={48} color="var(--warning)" />
              <h3 style={{ fontSize: '18px' }}>Not Connected</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Connect your WhatsApp account to start sending messages.</p>
              <button className="btn btn-primary" onClick={handleConnect}>
                Connect Account
              </button>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="glass-panel" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Smartphone size={24} className="text-primary" />
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Meta Cloud API Setup</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--primary)' }}>Webhook Configuration</h3>
              <div className="input-group">
                <label>Callback URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    readOnly 
                    value={`${window.location.origin}/webhook`}
                  />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '8px' }}>
                  Note: For local testing, use <strong>ngrok</strong> to get a public URL and replace this URL with your ngrok URL.
                </p>
              </div>

              <div className="input-group">
                <label>Verify Token</label>
                <input 
                  type="text" 
                  className="input-field" 
                  readOnly 
                  value="WP_TOOL_VERIFY_TOKEN_2026"
                />
              </div>
            </div>

            <div className="glass-panel" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>API Instructions</h3>
              <ul style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '16px' }}>
                <li>Configure the Webhook in your Meta App settings.</li>
                <li>Ensure you have <strong>messages</strong> and <strong>message_status</strong> permissions.</li>
                <li>Go to <strong>Message Composer</strong> to send campaigns using the Official API.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
