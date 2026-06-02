import React, { useState, useEffect, useRef } from 'react'
import { 
  Lock, Copy, Check, QrCode, RefreshCw, X, ShieldCheck, 
  Send, AlertCircle 
} from 'lucide-react'
import { 
  loadPeerJS, sendFileChunks 
} from '../../utils/p2pEngine'

// Dynamic QR generator loader
const loadQrGenerator = () => {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(window.qrcode);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function SecureShareButton({ file, fileName }) {
  const [showModal, setShowModal] = useState(false)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  
  // Connection states
  const [peerId, setPeerId] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [peerInstance, setPeerInstance] = useState(null)
  const [connectionState, setConnectionState] = useState('idle') // idle, registering, waiting, transferring, completed, error
  const connectionStateRef = useRef('idle')
  const [transferProgress, setTransferProgress] = useState(0)
  const [transferSpeed, setTransferSpeed] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isBrokerConnected, setIsBrokerConnected] = useState(false)
  
  const [copySuccess, setCopySuccess] = useState(false)
  const activeConnRef = useRef(null)
  
  const updateConnectionState = (newState) => {
    connectionStateRef.current = newState;
    setConnectionState(newState);
  };

  // Initialize script loaders on mount
  useEffect(() => {
    loadQrGenerator()
      .then(() => setScriptsLoaded(true))
      .catch((err) => console.error('Failed to load QR generator inside Share button:', err));
      
    return () => {
      cleanupConnections();
    };
  }, []);

  const cleanupConnections = () => {
    if (peerInstance) {
      peerInstance.destroy();
    }
    if (activeConnRef.current) {
      activeConnRef.current.close();
    }
    setPeerInstance(null);
    activeConnRef.current = null;
  };

  const handleOpenShare = () => {
    if (!file) {
      alert('Please process or compress your file first before sharing.');
      return;
    }
    setShowModal(true);
    startP2PChannel();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    cleanupConnections();
    setConnectionState('idle');
    setTransferProgress(0);
    setErrorMessage('');
  };

  const startP2PChannel = async () => {
    updateConnectionState('registering');
    setErrorMessage('');
    
    // Check for secure context / WebRTC support
    const RTCPeerConnectionClass = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    if (!RTCPeerConnectionClass) {
      setErrorMessage('Direct sharing requires a Secure Context (HTTPS or localhost). Please ensure your connection is secure.');
      updateConnectionState('error');
      return;
    }
    
    try {
      const PeerClass = await loadPeerJS();
      
      const generatedPeerId = `fileora-${Math.floor(10000 + Math.random() * 90000)}`;
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      setPeerId(generatedPeerId);
      setPinCode(generatedPin);
      updateConnectionState('waiting'); // Transition instantly for zero-delay UX!
      setIsBrokerConnected(false);
      
      const peer = new PeerClass(generatedPeerId, {
        host: '0.peerjs.com',
        secure: true,
        port: 443,
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });
      
      setPeerInstance(peer);
      
      peer.on('open', () => {
        setIsBrokerConnected(true);
      });
      
      peer.on('connection', (conn) => {
        if (activeConnRef.current) {
          conn.close();
          return;
        }

        const handleConnOpen = () => {
          activeConnRef.current = conn;
        };

        if (conn.open) {
          handleConnOpen();
        } else {
          conn.on('open', handleConnOpen);
        }
        
        conn.on('data', (data) => {
          // Handle both object and string formats
          let parsed = data;
          if (typeof data === 'string') {
            try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
          }
          
          if (parsed && parsed.type === 'PAIRING_REQUEST') {
            if (parsed.pin === generatedPin) {
              // PIN Verified! Notify receiver and start stream
              conn.send({ 
                type: 'PAIRING_ACCEPTED', 
                fileName: fileName || file.name || 'shared-file', 
                fileSize: file.size, 
                fileType: file.type || 'application/octet-stream' 
              });
              updateConnectionState('transferring');
              
              let startTime = Date.now();
              sendFileChunks(file, conn, (offset, total) => {
                const progress = Math.min(Math.round((offset / total) * 100), 100);
                setTransferProgress(progress);
                
                const elapsed = (Date.now() - startTime) / 1000;
                if (elapsed > 0.5) {
                  const speed = (offset / (1024 * 1024)) / elapsed; // MB/s
                  setTransferSpeed(`${speed.toFixed(1)} MB/s`);
                }
              });
            } else {
              // Invalid PIN
              conn.send({ type: 'PAIRING_REJECTED', reason: 'Invalid secure 4-digit PIN.' });
              conn.close();
              activeConnRef.current = null;
              updateConnectionState('waiting');
            }
          }
        });
        
        conn.on('close', () => {
          activeConnRef.current = null;
          if (connectionStateRef.current !== 'completed') {
            updateConnectionState('waiting');
          }
        });
      });
      
      peer.on('error', (err) => {
        console.error('PeerJS inside tool button error:', err);
        setErrorMessage('Failed to connect to signaling broker. Try again.');
        updateConnectionState('error');
      });
      
    } catch (err) {
      console.error(err);
      setErrorMessage('P2P secure connection failed. Try again.');
      updateConnectionState('error');
    }
  };

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/share?peer=${peerId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const renderQrCode = (text) => {
    if (!window.qrcode) return '';
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createImgTag(4);
    } catch (err) {
      return '';
    }
  };

  return (
    <>
      {/* Share trigger button */}
      <button 
        onClick={handleOpenShare}
        className="btn-premium btn-premium-secondary" 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
      >
        <Lock size={16} style={{ color: 'var(--accent-primary)' }} />
        <span>Direct P2P Share</span>
      </button>

      {/* MODAL OVERLAY */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div className="glass-card-premium" style={{ width: '100%', maxWidth: '500px', padding: '2rem', border: '1px solid var(--border-color)', position: 'relative', background: '#0a0f1d' }}>
            
            {/* Modal Close */}
            <button 
              onClick={handleCloseModal}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Lock size={18} style={{ color: 'var(--accent-primary)' }} />
                <span>Direct P2P Secure Share</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Pipes files directly between memory sandboxes.</p>
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* REGISTERING STATE */}
            {connectionState === 'registering' && (
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <RefreshCw className="spinning" size={28} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '15px' }}>Broker pairing channel...</h4>
              </div>
            )}

            {/* WAITING FOR PAIRING */}
            {connectionState === 'waiting' && (
              <div style={{ textAlign: 'center' }}>
                
                <div style={{ background: 'white', padding: '12px', borderRadius: '10px', display: 'inline-block', marginBottom: '1.25rem' }} 
                  dangerouslySetInnerHTML={{ __html: renderQrCode(`${window.location.origin}/share?peer=${peerId}`) }}>
                </div>
                
                <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Share Link</label>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', marginBottom: '1rem' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/share?peer=${peerId}`} 
                      style={{ flex: 1, padding: '8px 10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-primary)' }}
                    />
                    <button onClick={handleCopyLink} className="icon-button-square" style={{ width: '36px', height: '36px' }}>
                      {copySuccess ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Pairing code</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '4px' }}>{pinCode}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Enter PIN on receiving<br/>device to authorize
                    </div>
                  </div>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isBrokerConnected ? '#10b981' : '#f59e0b', display: 'inline-block', boxShadow: isBrokerConnected ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} className="glowing-pulse"></span>
                  <span>{isBrokerConnected ? 'Pairing active. Waiting for receiver...' : 'Establishing secure channel...'}</span>
                </div>
              </div>
            )}

            {/* TRANSFER PROGRESS */}
            {connectionState === 'transferring' && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.25rem' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '4px solid rgba(59, 130, 246, 0.1)', zIndex: 1 }} />
                  <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', width: '100px', height: '100px', zIndex: 2 }}>
                    <circle 
                      cx="50" cy="50" r="42" 
                      stroke="var(--accent-primary)" 
                      strokeWidth="5" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - transferProgress / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{transferProgress}%</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{transferSpeed || 'Streaming'}</span>
                  </div>
                </div>
                <h4>Streaming direct local bits...</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', maxWidth: '300px', margin: '0 auto' }}>
                  WebRTC Datachannel active. Pipes data memory-to-memory securely.
                </p>
              </div>
            )}

            {/* STREAM COMPLETE */}
            {connectionState === 'completed' && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <ShieldCheck size={24} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '0.25rem' }}>Stream Complete!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '1.25rem' }}>
                  File streamed directly and compiled securely in the receiver's local browser sandbox.
                </p>
                <button 
                  onClick={handleCloseModal}
                  className="btn-premium btn-premium-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px' }}
                >
                  Done
                </button>
              </div>
            )}

            {/* ERROR / RESTART */}
            {connectionState === 'error' && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <button 
                  onClick={startP2PChannel}
                  className="btn-premium btn-premium-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px' }}
                >
                  Retry Connection
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
