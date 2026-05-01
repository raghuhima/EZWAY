import React, { useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Paperclip, Save, FileText } from 'lucide-react';
import socket from '../utils/socket';
import { API_BASE } from '../config';

const Composer = () => {
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [minDelay, setMinDelay] = useState(10);
  const [maxDelay, setMaxDelay] = useState(20);
  const [file, setFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');

  const fetchTemplates = () => {
    fetch(`${API_BASE}/api/templates`)
      .then(res => res.json())
      .then(data => setTemplates(data));
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then(res => res.json())
      .then(data => setConnectionStatus(data.status));
    
    fetchTemplates();

    socket.on('status', (data) => {
      setConnectionStatus(data.status);
    });

    return () => socket.off('status');
  }, []);

  const handleSaveTemplate = async () => {
    if (!message || !templateName) {
      setStatusMsg('Message and Template Name are required to save.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, content: message })
      });
      const data = await res.json();
      setStatusMsg(data.message);
      setTemplateName('');
      fetchTemplates();
    } catch (err) {
      setStatusMsg('Error saving template.');
    }
  };

  const handleCheck = async () => {
    if (connectionStatus !== 'CONNECTED') {
      setStatusMsg('Please connect your WhatsApp account first.');
      return;
    }
    if (!numbers) return;
    setIsChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers })
      });
      const data = await res.json();
      if (!Array.isArray(data)) {
        setStatusMsg(data.error || 'Check failed. Is WhatsApp connected?');
        return;
      }
      setValidationResults(data);
      
      const validOnes = data.filter(r => r.exists).map(r => r.number);
      if (validOnes.length > 0) {
        setNumbers(validOnes.join(', '));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCsvUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    setStatusMsg('Parsing CSV...');
    try {
      const res = await fetch(`${API_BASE}/api/upload-csv`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.numbers) {
        setNumbers(data.numbers.join(', '));
        setStatusMsg(`Imported ${data.numbers.length} numbers from CSV.`);
      }
    } catch (err) {
      setStatusMsg('Error parsing CSV.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!numbers || !message) {
      setStatusMsg('Numbers and message are required.');
      return;
    }

    const formData = new FormData();
    formData.append('numbers', numbers);
    formData.append('message', message);
    formData.append('minDelay', minDelay);
    formData.append('maxDelay', maxDelay);
    if (file) {
      formData.append('media', file);
    }

    setStatusMsg('Queuing campaign...');
    
    try {
      const res = await fetch(`${API_BASE}/api/send`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setStatusMsg(data.message + ` (${data.total} numbers)`);
      setMessage('');
      setNumbers('');
      setFile(null);
      setValidationResults(null);
    } catch (err) {
      setStatusMsg('Error queuing campaign.');
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Message Composer</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel">
          <form onSubmit={handleSend}>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginBottom: 0 }}>Target Audience (Comma separated)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => document.getElementById('csv-import').click()}
                  >
                    <Paperclip size={14} /> Upload CSV
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={handleCheck}
                    disabled={isChecking || !numbers}
                  >
                    {isChecking ? 'Checking...' : 'Check Connection'}
                  </button>
                </div>
                <input 
                  id="csv-import" 
                  type="file" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={handleCsvUpload} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <a 
                  href={`${API_BASE}/api/download-sample`} 
                  style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  download
                >
                  Download Sample CSV
                </a>
              </div>
              <textarea 
                className="input-field" 
                rows="4" 
                placeholder="+9198XXXXXXX, +9187XXXXXXX"
                value={numbers}
                onChange={e => setNumbers(e.target.value)}
              />
              {validationResults && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Found {validationResults.filter(r => r.exists).length} valid WhatsApp numbers. 
                  {validationResults.filter(r => !r.exists).length > 0 && 
                    ` Removed ${validationResults.filter(r => !r.exists).length} invalid numbers.`}
                </div>
              )}
            </div>


            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginBottom: 0 }}>Message content</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use Template:</span>
                  <select 
                    className="input-field" 
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '12px', 
                      width: '180px', 
                      marginBottom: 0,
                      background: '#1e293b',
                      color: 'white',
                      border: '1px solid var(--primary)'
                    }}
                    onChange={(e) => {
                      const selected = templates.find(t => t.id.toString() === e.target.value);
                      if (selected) setMessage(selected.content);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select Template</option>
                    {templates.length === 0 ? (
                      <option disabled>No templates saved</option>
                    ) : (
                      templates.map(t => (
                        <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>{t.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <textarea 
                className="input-field" 
                rows="6" 
                placeholder="Hi {name}, your offer is ready! 🔥"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ flex: 1, padding: '4px 12px', fontSize: '12px', marginBottom: 0 }}
                  placeholder="Template Name"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={handleSaveTemplate}
                >
                  <Save size={14} /> Save Template
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Min Delay (Seconds)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={minDelay}
                  onChange={e => setMinDelay(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Max Delay (Seconds)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={maxDelay}
                  onChange={e => setMaxDelay(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Attach Media (Image, Video, PDF)</label>
              <div style={{ 
                border: '2px dashed var(--glass-border)', 
                padding: '24px', 
                borderRadius: '8px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.3)',
                cursor: 'pointer'
              }} onClick={() => document.getElementById('file-upload').click()}>
                {file ? (
                  <div style={{ color: 'var(--success)', fontWeight: '500' }}>{file.name} attached</div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>
                    <ImageIcon size={24} style={{ marginBottom: '8px' }} />
                    <p>Click to upload media</p>
                  </div>
                )}
                <input 
                  id="file-upload" 
                  type="file" 
                  style={{ display: 'none' }} 
                  onChange={e => setFile(e.target.files[0])}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
              <button type="submit" className="btn btn-primary">
                <Send size={18} /> Send Campaign
              </button>
              {statusMsg && <span style={{ color: 'var(--text-muted)' }}>{statusMsg}</span>}
            </div>
          </form>
        </div>

        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Phone Preview</h3>
          <div style={{ 
            background: '#efeae2', 
            borderRadius: '16px', 
            padding: '16px',
            minHeight: '300px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Fake WhatsApp Header */}
            <div style={{ 
              background: '#075e54', 
              color: 'white', 
              padding: '12px', 
              position: 'absolute', 
              top: 0, left: 0, right: 0,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Contact Name
            </div>
            
            {/* Fake Message Bubble */}
            <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(message || file) ? (
                <div style={{ 
                  background: '#dcf8c6', 
                  padding: '12px', 
                  borderRadius: '12px 0 12px 12px', 
                  color: '#111',
                  maxWidth: '85%',
                  alignSelf: 'flex-end',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {file && (
                    <div style={{ background: '#000', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {file.type && file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ padding: '30px' }}><ImageIcon color="#fff" /></div>
                      )}
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                    {message || 'Your message preview...'}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#888', textAlign: 'center', fontSize: '12px', marginTop: '20px' }}>
                  Preview will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Composer;
