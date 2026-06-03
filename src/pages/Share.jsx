import React, { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { 
  Wifi, Copy, Check, Upload, 
  Download, RefreshCw, Lock, ShieldCheck, 
  FileText, X, AlertCircle
} from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import { 
  createPeer, waitForPeerOpen, waitForConnOpen,
  sendFileChunks, normalizePeerId,
  makePeerId, makePin
} from '../utils/p2pEngine'
import { makeQrDataUrl, isQrFriendlyPayload } from '../utils/shareQr'
import { useShare } from '../context/ShareContext'

function ShareQrImage({ text, size = 180 }) {
  if (!isQrFriendlyPayload(text)) {
    return (
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: size, margin: '0 auto' }}>
        Connection link is too long for a QR image.
      </p>
    )
  }
  const src = makeQrDataUrl(text)
  if (!src) {
    return <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>QR preview unavailable.</p>
  }
  return <img src={src} alt="QR code" width={size} height={size} style={{ display: 'block', margin: '0 auto' }} />
}

const getInitialShareParams = () => {
  if (typeof window === 'undefined') return { tab: 'send', peer: '' };
  const peer = new URLSearchParams(window.location.search).get('peer');
  return {
    tab: peer ? 'receive' : 'send',
    peer: peer ? normalizePeerId(peer) : '',
  };
};

export default function Share() {
  const { tab: initialTab, peer: initialPeer } = getInitialShareParams();

  // Tabs: 'send' | 'receive'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Internet connection state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  
  // File states
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  
  // Share Context (Preloaded files)
  const { sharedFile, clearSharedFile } = useShare()
  
  // P2P states (Sender)
  const [peerId, setPeerId] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [connectionState, setConnectionState] = useState('idle') // idle, registering, waiting, connecting, transferring, completed, error
  const connectionStateRef = useRef('idle')
  const [senderProgress, setSenderProgress] = useState(0)
  const [senderSpeed, setSenderSpeed] = useState('')
  const [senderEta, setSenderEta] = useState('')
  const [transferStatus, setTransferStatus] = useState('')
  const activeConnRef = useRef(null)
  const peerInstanceRef = useRef(null)
  const pinCodeRef = useRef('')
  
  // P2P states (Receiver)
  const [targetPeerId, setTargetPeerId] = useState(initialPeer)
  const [enteredPin, setEnteredPin] = useState('')
  const [receiverProgress, setReceiverProgress] = useState(0)
  const [receiverSpeed, setReceiverSpeed] = useState('')
  const [receiverEta, setReceiverEta] = useState('')
  const [receivedFile, setReceivedFile] = useState(null)
  
  // UI Helpers
  const [copySuccess, setCopySuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('Select a file, then generate a share channel.')

  const updateConnectionState = (newState) => {
    connectionStateRef.current = newState;
    setConnectionState(newState);
  };

  const setStatus = (msg) => {
    console.info('[Share]', msg)
    setStatusMessage(msg)
  }

  // Preload file if available in context
  useEffect(() => {
    if (sharedFile) {
      setSelectedFile(sharedFile);
      clearSharedFile(); // Clear context so it doesn't double-trigger
      setStatus('File preloaded successfully. Ready to generate share channel.');
    }
  }, [sharedFile, clearSharedFile]);

  // Monitor internet connection status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      setErrorMessage('');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setErrorMessage('You are currently offline. An active internet connection is required to start a P2P share session.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cleanupConnections = () => {
    if (activeConnRef.current) {
      try {
        activeConnRef.current.close();
      } catch (e) {
        console.warn('[Share] conn close:', e);
      }
      activeConnRef.current = null;
    }
    if (peerInstanceRef.current) {
      try {
        peerInstanceRef.current.destroy();
      } catch (e) {
        console.warn('[Share] peer destroy:', e);
      }
      peerInstanceRef.current = null;
    }
    setSenderProgress(0);
    setReceiverProgress(0);
    setSenderSpeed('');
    setReceiverSpeed('');
    setSenderEta('');
    setReceiverEta('');
    setTransferStatus('');
  };

  useEffect(() => () => cleanupConnections(), []);

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      cleanupConnections();
      updateConnectionState('idle');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      cleanupConnections();
      updateConnectionState('idle');
    }
  };

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/share?peer=${peerId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // SENDER FLOW (PeerJS)
  const startCloudShare = async () => {
    if (!selectedFile) return;
    if (!navigator.onLine) {
      setErrorMessage('You are offline. Please connect to the internet to generate a secure channel.');
      return;
    }

    cleanupConnections();
    updateConnectionState('registering');
    setErrorMessage('');
    setStatus('Connecting to signaling server…');

    try {
      const generatedPeerId = makePeerId();
      const generatedPin = makePin();

      setPeerId(generatedPeerId);
      setPinCode(generatedPin);
      pinCodeRef.current = generatedPin;

      const peer = createPeer(generatedPeerId);
      peerInstanceRef.current = peer;

      peer.on('error', (err) => {
        console.error('[Sender] Peer error:', err);
        setErrorMessage(err.message || 'Failed to connect to signaling server.');
        updateConnectionState('error');
        setStatus('Error occurred.');
      });

      await waitForPeerOpen(peer);
      updateConnectionState('waiting');
      setStatus('Waiting for receiver to connect...');

      peer.on('connection', (conn) => {
        if (activeConnRef.current) {
          activeConnRef.current.close();
        }
        activeConnRef.current = conn;
        updateConnectionState('connecting');
        setStatus('Receiver connected. Authenticating...');

        conn.on('open', () => {
          console.log('[Sender] Data connection opened.');
        });

        conn.on('data', (data) => {
          if (data && typeof data === 'object') {
            if (data.type === 'AUTH') {
              if (String(data.pin) === pinCodeRef.current) {
                // PIN matches!
                conn.send({ type: 'AUTH_OK' });
                conn.send({
                  type: 'META',
                  name: selectedFile.name,
                  size: selectedFile.size,
                  mime: selectedFile.type || 'application/octet-stream'
                });
                
                updateConnectionState('transferring');
                setStatus('Transferring file...');
                const startTime = Date.now();
                
                sendFileChunks(selectedFile, conn, 
                  (offset, total) => {
                    const progress = Math.min(Math.round((offset / total) * 100), 100);
                    setSenderProgress(progress);
                    
                    const elapsed = (Date.now() - startTime) / 1000;
                    if (elapsed > 0.5) {
                      const speedBytesSec = offset / elapsed;
                      const speedMb = (speedBytesSec / (1024 * 1024)).toFixed(1);
                      setSenderSpeed(speedMb + ' MB/s');
                      
                      const remainingBytes = total - offset;
                      if (speedBytesSec > 0) {
                        const etaSecs = Math.ceil(remainingBytes / speedBytesSec);
                        if (etaSecs > 60) {
                          setSenderEta(`${Math.floor(etaSecs / 60)}m ${etaSecs % 60}s remaining`);
                        } else {
                          setSenderEta(`${etaSecs}s remaining`);
                        }
                      }
                    }
                    if (progress >= 100) {
                      updateConnectionState('completed');
                      setStatus('Transfer complete!');
                    }
                  },
                  (status) => {
                    setTransferStatus(status);
                  }
                );
              } else {
                conn.send({ type: 'AUTH_FAIL', reason: 'Incorrect 4-digit PIN.' });
                setErrorMessage('Receiver authentication failed: Incorrect PIN.');
                updateConnectionState('waiting');
                setStatus('Waiting for receiver...');
                setTimeout(() => conn.close(), 1000);
              }
            }
          }
        });

        conn.on('close', () => {
          console.log('[Sender] Connection closed.');
          if (connectionStateRef.current !== 'completed') {
            setErrorMessage('Receiver disconnected.');
            updateConnectionState('waiting');
            setStatus('Waiting for receiver...');
          }
        });

        conn.on('error', (err) => {
          console.error('[Sender] Connection error:', err);
          setErrorMessage('Connection error occurred.');
          updateConnectionState('waiting');
        });
      });

    } catch (err) {
      console.error('[Share] Sender setup failed:', err);
      setErrorMessage(err.message || 'Failed to start sharing.');
      updateConnectionState('error');
      setStatus('Setup failed.');
      cleanupConnections();
    }
  };

  // RECEIVER FLOW (PeerJS)
  const connectToSender = async () => {
    if (!navigator.onLine) {
      setErrorMessage('You are offline. Please connect to the internet to contact the signaling server.');
      return;
    }
    const senderId = normalizePeerId(targetPeerId);
    const pin = enteredPin.trim();

    if (!senderId || !pin) {
      setErrorMessage('Please enter the Channel ID and 4-digit PIN.');
      return;
    }

    cleanupConnections();
    updateConnectionState('connecting');
    setErrorMessage('');
    setReceivedFile(null);
    setStatus('Connecting to signaling server...');

    try {
      const localId = `fileora-rcv-${Math.floor(10000 + Math.random() * 90000)}`;
      const peer = createPeer(localId);
      peerInstanceRef.current = peer;

      peer.on('error', (err) => {
        console.error('[Receiver] Peer error:', err);
        setErrorMessage(err.message || 'Connection error.');
        updateConnectionState('error');
        setStatus('Error occurred.');
      });

      await waitForPeerOpen(peer);
      
      setStatus('Opening secure peer channel...');
      const conn = peer.connect(senderId, { reliable: true });
      activeConnRef.current = conn;

      await waitForConnOpen(conn);
      
      setStatus('Authenticating with Sender...');
      conn.send({ type: 'AUTH', pin });

      let fileMeta = null;
      const incomingChunks = [];
      let bytesReceived = 0;
      let startTime = Date.now();

      conn.on('data', (data) => {
        if (data && typeof data === 'object' && data.type) {
          if (data.type === 'AUTH_OK') {
            setStatus('Authenticated! Awaiting file transfer...');
            setTransferStatus('Handshake established. Buffering...');
          } else if (data.type === 'AUTH_FAIL') {
            setErrorMessage(data.reason || 'Authentication failed.');
            updateConnectionState('error');
            cleanupConnections();
          } else if (data.type === 'META') {
            fileMeta = data;
            updateConnectionState('transferring');
            setStatus(`Receiving ${data.name}...`);
            setTransferStatus('Pipelining chunks...');
            startTime = Date.now();
          } else if (data.type === 'TRANSFER_COMPLETE') {
            const blob = new Blob(incomingChunks, { type: fileMeta?.mime || 'application/octet-stream' });
            const fileUrl = URL.createObjectURL(blob);
            setReceivedFile({
              name: fileMeta?.name || 'received-file',
              size: fileMeta?.size || bytesReceived,
              url: fileUrl
            });
            updateConnectionState('completed');
            setStatus('Transfer complete!');
            setTransferStatus('Assembly finished!');
            
            // Auto download
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = fileMeta?.name || 'received-file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            cleanupConnections();
          }
        } else {
          if (data) {
            incomingChunks.push(data);
            bytesReceived += data.byteLength || data.size || 0;
            if (fileMeta && fileMeta.size) {
              const progress = Math.min(Math.round((bytesReceived / fileMeta.size) * 100), 100);
              setReceiverProgress(progress);
              
              const elapsed = (Date.now() - startTime) / 1000;
              if (elapsed > 0.5) {
                const speedBytesSec = bytesReceived / elapsed;
                const speedMb = (speedBytesSec / (1024 * 1024)).toFixed(1);
                setReceiverSpeed(speedMb + ' MB/s');
                
                const remainingBytes = fileMeta.size - bytesReceived;
                if (speedBytesSec > 0) {
                  const etaSecs = Math.ceil(remainingBytes / speedBytesSec);
                  if (etaSecs > 60) {
                    setReceiverEta(`${Math.floor(etaSecs / 60)}m ${etaSecs % 60}s remaining`);
                  } else {
                    setReceiverEta(`${etaSecs}s remaining`);
                  }
                }
              }
            }
          }
        }
      });

      conn.on('close', () => {
        console.log('[Receiver] Connection closed.');
        if (connectionStateRef.current !== 'completed') {
          setErrorMessage('Connection closed by sender.');
          updateConnectionState('error');
        }
      });

      conn.on('error', (err) => {
        console.error('[Receiver] Connection error:', err);
        setErrorMessage('Failed to connect to sender.');
        updateConnectionState('error');
      });

    } catch (err) {
      console.error('[Share] Receiver setup failed:', err);
      setErrorMessage(err.message || 'Failed to connect. Make sure Sender is online and has the same Channel ID.');
      updateConnectionState('error');
      setStatus('Connection failed.');
      cleanupConnections();
    }
  };

  return (
    <div className="app-shell">
      <Helmet>
        <title>🔒 Secure P2P File Share - Fileora</title>
        <meta name="description" content="Share massive files of any size directly device-to-device with no servers. Completely private, end-to-end encrypted local WebRTC peer-to-peer file sharing." />
        <link rel="canonical" href="https://fileora.tech/share" />
      </Helmet>

      <Navbar />

      <main className="main-content-premium container-premium" style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Header Title with Pulse */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', padding: '6px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1rem', textTransform: 'uppercase' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', boxShadow: '0 0 8px var(--accent-primary)' }} className="glowing-pulse"></span>
              Secure Peer-to-Peer Transfer
            </div>
            <h1 className="h1-premium" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Direct P2P File Share</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', maxWidth: '500px', margin: '0 auto' }}>
              Files stream natively from memory to memory. 100% private, fully encrypted, with zero server storage.
            </p>
          </div>

          {/* Main Panel Card */}
          <div className="glass-card-premium" style={{ padding: '2rem', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Mode selection tabs */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.5)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <button 
                type="button"
                className={`tab-button-premium ${activeTab === 'send' ? 'active' : ''}`}
                onClick={() => { setActiveTab('send'); setErrorMessage(''); setStatus('Send: pick a file, then generate a channel.'); }}
                style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}
              >
                Send Files
              </button>
              <button 
                type="button"
                className={`tab-button-premium ${activeTab === 'receive' ? 'active' : ''}`}
                onClick={() => { setActiveTab('receive'); setErrorMessage(''); setStatus('Receive: enter Channel ID + PIN.'); }}
                style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}
              >
                Receive Files
              </button>
            </div>

            {/* Offline Error Banner */}
            {!isOnline && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>You are currently offline. Please check your internet connection to use P2P share.</span>
              </div>
            )}

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--text-secondary)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--accent-primary)' }}>Status: </strong>
              {statusMessage}
              <span style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>State: {connectionState}</span>
            </div>

            {errorMessage && isOnline && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
                {(errorMessage.toLowerCase().includes('signaling') || errorMessage.toLowerCase().includes('connect') || errorMessage.toLowerCase().includes('insecure') || errorMessage.toLowerCase().includes('fail')) && (
                  <div style={{ fontSize: '12px', opacity: 0.85, paddingLeft: '24px', borderTop: '1px solid rgba(239, 68, 68, 0.15)', paddingTop: '6px', marginTop: '4px', textAlign: 'left', lineHeight: '1.4' }}>
                    💡 <strong>Tip:</strong> Ad blockers can sometimes block secure WebRTC signaling servers. If this persists, try disabling your ad blocker for Fileora, or switch to <strong>Local Offline Mode</strong>.
                  </div>
                )}
              </div>
            )}

            {/* SEND TAB */}
            {activeTab === 'send' && (
              <div>
                {!selectedFile ? (
                  // DropZone
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    style={{ border: '2px dashed var(--accent-primary)', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '16px', padding: '3.5rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    className="drop-zone-premium"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      style={{ display: 'none' }} 
                    />
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1rem', color: 'var(--accent-primary)' }}>
                      <Upload size={24} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.25rem' }}>Drag & drop any file here</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Supports documents, images, and videos up to 10GB+</p>
                  </div>
                ) : (
                  // File Selected Panel
                  <div>
                    {/* Selected File Card */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-primary)' }}>
                          <FileText size={20} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, wordBreak: 'break-all' }}>{selectedFile.name}</h4>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setSelectedFile(null); cleanupConnections(); updateConnectionState('idle'); }}
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* IDLE: Trigger sharing */}
                    {connectionState === 'idle' && (
                      <button 
                        type="button"
                        onClick={startCloudShare}
                        disabled={!isOnline}
                        className="btn-premium btn-premium-primary"
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '15px' }}
                      >
                        Generate Secure Share Channel
                      </button>
                    )}

                    {/* SENDER STATUSES */}
                    {connectionState === 'registering' && (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <RefreshCw className="spinning" size={32} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                        <h3>Registering Secure Share Link...</h3>
                      </div>
                    )}

                    {connectionState === 'waiting' && (
                      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* QR Code Card */}
                          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block' }}>
                            <ShareQrImage text={`${window.location.origin}/share?peer=${peerId}`} />
                          </div>
                          
                          {/* Credentials Panel */}
                          <div style={{ textAlign: 'left', flex: 1, minWidth: '250px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>CHANNEL ID (also in link)</label>
                            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)', margin: '4px 0 12px', fontFamily: 'monospace' }}>{peerId}</p>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>SHAREABLE PAIRING LINK</label>
                            <div style={{ display: 'flex', gap: '8px', margin: '4px 0 1rem' }}>
                              <input 
                                type="text" 
                                readOnly 
                                value={`${window.location.origin}/share?peer=${peerId}`} 
                                style={{ flex: 1, padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-primary)' }}
                              />
                              <button onClick={handleCopyLink} className="icon-button-square">
                                {copySuccess ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                              </button>
                            </div>

                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>SECURE ACCESS PIN</label>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '8px', margin: '4px 0 1rem' }}>
                              {pinCode}
                            </div>
                            
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} className="glowing-pulse"></span>
                              <span>Pairing active. Keep this screen open!</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SENDER PROGRESS MODULE */}
                    {(connectionState === 'transferring' || connectionState === 'connecting') && (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '4px solid rgba(59, 130, 246, 0.1)', zIndex: 1 }} />
                          <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', width: '120px', height: '120px', zIndex: 2 }}>
                            <circle 
                              cx="60" cy="60" r="50" 
                              stroke="var(--accent-primary)" 
                              strokeWidth="6" 
                              fill="transparent" 
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - senderProgress / 100)}`}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.1s' }}
                            />
                          </svg>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{senderProgress}%</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{senderSpeed || 'Connecting'}</span>
                          </div>
                        </div>
                        <h3>Streaming direct P2P data...</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Encrypting files and piping directly between device sandboxes.</p>

                        {/* Diagnostics terminal UI */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: 'monospace', color: '#10b981', textAlign: 'left', marginTop: '1.5rem', maxWidth: '400px', margin: '1.5rem auto 0', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                          <div style={{ opacity: 0.5, marginBottom: '6px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '4px' }}>// TRANSFER DIAGNOSTICS:</div>
                          <div>&gt; Status: {transferStatus || 'Negotiating RTC connection'}</div>
                          {senderSpeed && <div>&gt; Current Speed: {senderSpeed}</div>}
                          {senderEta && <div>&gt; Time Remaining: {senderEta}</div>}
                          <div>&gt; Chunks Transferred: {Math.ceil(selectedFile.size * (senderProgress / 100) / (selectedFile.size > 500 * 1024 * 1024 ? 256 * 1024 : (selectedFile.size > 100 * 1024 * 1024 ? 128 * 1024 : 64 * 1024)))}</div>
                        </div>
                      </div>
                    )}

                    {/* COMPLETED SUCCESS SCREEN */}
                    {connectionState === 'completed' && (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <ShieldCheck size={32} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '0.5rem' }}>Direct Stream Success!</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '350px', margin: '0 auto 1.5rem' }}>
                          File has been securely chunked, piped, and reconstructed on the destination browser sandbox.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => { 
                              cleanupConnections(); 
                              updateConnectionState('idle'); 
                              setTimeout(() => startCloudShare(), 50);
                            }} 
                            className="btn-premium btn-premium-primary"
                            style={{ padding: '10px 24px', borderRadius: '8px' }}
                          >
                            Share Again
                          </button>
                          <button 
                            onClick={() => { setSelectedFile(null); cleanupConnections(); updateConnectionState('idle'); }} 
                            className="btn-premium btn-premium-secondary"
                            style={{ padding: '10px 24px', borderRadius: '8px' }}
                          >
                            Share Another File
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* RECEIVE TAB */}
            {activeTab === 'receive' && (
              <div>
                {/* IDLE / NOT REGISTERED STATE */}
                {connectionState === 'idle' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>SENDER CHANNEL ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. fileora-7a2x..."
                      value={targetPeerId}
                      onChange={(e) => setTargetPeerId(e.target.value)}
                      onBlur={(e) => setTargetPeerId(normalizePeerId(e.target.value))}
                      style={{ width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '1rem' }}
                    />

                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>4-DIGIT SECURE PIN</label>
                    <input 
                      type="text" 
                      placeholder="Enter PIN shown on Sender screen"
                      maxLength={4}
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      style={{ width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '4px', textAlign: 'center', fontWeight: '800', marginBottom: '1.5rem' }}
                    />

                    <button 
                      type="button"
                      onClick={connectToSender}
                      disabled={!isOnline}
                      className="btn-premium btn-premium-primary"
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '15px' }}
                    >
                      Connect & Request Stream
                    </button>
                  </div>
                )}

                {/* RECEIVING PROGRESS RING */}
                {(connectionState === 'transferring' || connectionState === 'connecting') && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '4px solid rgba(59, 130, 246, 0.1)', zIndex: 1 }} />
                      <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', width: '120px', height: '120px', zIndex: 2 }}>
                        <circle 
                          cx="60" cy="60" r="50" 
                          stroke="var(--accent-primary)" 
                          strokeWidth="6" 
                          fill="transparent" 
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - receiverProgress / 100)}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.1s' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{receiverProgress}%</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{receiverSpeed || 'Connecting'}</span>
                      </div>
                    </div>
                    <h3>Downloading direct P2P data...</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Receiving file fragments directly into local sandboxed memory stream.</p>

                    {/* Diagnostics terminal UI */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: 'monospace', color: '#10b981', textAlign: 'left', marginTop: '1.5rem', maxWidth: '400px', margin: '1.5rem auto 0', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                      <div style={{ opacity: 0.5, marginBottom: '6px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '4px' }}>// RECEIVER DIAGNOSTICS:</div>
                      <div>&gt; Status: {transferStatus || 'Authenticating secure credentials'}</div>
                      {receiverSpeed && <div>&gt; Current Speed: {receiverSpeed}</div>}
                      {receiverEta && <div>&gt; ETA Remaining: {receiverEta}</div>}
                    </div>
                  </div>
                )}

                {/* COMPLETED / DOWNLOADED SCREEN */}
                {connectionState === 'completed' && receivedFile && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <ShieldCheck size={32} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '0.5rem' }}>File Received Successfully!</h2>
                    
                    {/* Received File Metadata Card */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'inline-flex', alignItems: 'center', gap: '12px', textAlign: 'left', margin: '0 auto 1.5rem', maxWidth: '350px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10b981' }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, wordBreak: 'break-all' }}>{receivedFile.name}</h4>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{(receivedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <a 
                        href={receivedFile.url} 
                        download={receivedFile.name}
                        className="btn-premium btn-premium-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}
                      >
                        <Download size={16} />
                        <span>Download Local Copy</span>
                      </a>
                      <button 
                        onClick={() => { setReceivedFile(null); cleanupConnections(); updateConnectionState('idle'); }} 
                        className="btn-premium btn-premium-secondary"
                        style={{ padding: '10px 24px', borderRadius: '8px' }}
                      >
                        Receive Another File
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Error display */}
            {connectionState === 'error' && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <button 
                  onClick={() => { cleanupConnections(); updateConnectionState('idle'); }} 
                  className="btn-premium btn-premium-primary"
                  style={{ padding: '10px 24px', borderRadius: '8px' }}
                >
                  Restart Pairing Channel
                </button>
              </div>
            )}

          </div>

          {/* Privacy Note Badge */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', background: 'rgba(15, 23, 42, 0.4)', padding: '8px 16px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
              <Lock size={12} style={{ color: 'var(--accent-primary)' }} />
              <span>Files stream directly browser-to-browser. No intermediate storage logs exist.</span>
            </div>
          </div>

          {/* Security details section */}
          <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
              P2P Security & Privacy Precautions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left' }} className="mobile-grid-1col">
              <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>🔒 100% Direct & Private</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Your files are never uploaded, stored, or processed on any server. The data streams directly from the sender's browser memory to the receiver's browser memory using WebRTC.
                </p>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>🔑 Secure PIN Authorization</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Every session is protected by a randomized Channel ID and a secure 4-digit PIN. Only peers who have the PIN can establish a tunnel and receive the file.
                </p>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>🛡️ End-to-End Encryption</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Data connections are protected with DTLS (Datagram Transport Layer Security) and SRTP protocols. This guarantees that your file content cannot be intercepted.
                </p>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>📡 PeerJS Cloud Broker</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  We utilize the public PeerJS signaling service to negotiate connection handshake metadata (SDP/ICE) between devices. No file content ever touches this signaling server.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
