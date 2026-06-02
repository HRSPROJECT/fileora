import React, { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Wifi, WifiOff, Copy, Check, QrCode, Camera, Upload, 
  Download, RefreshCw, Lock, ShieldCheck, Link, 
  FileText, ArrowRight, X, AlertCircle
} from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import { 
  loadPeerJS, compressSDP, decompressSDP, 
  sendFileChunks, CHUNK_SIZE 
} from '../utils/p2pEngine'

// Dynamic script loaders
const loadQrGenerator = () => {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(window.qrcode);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadQrScanner = () => {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(window.jsQR);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function Share() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Tabs: 'send' | 'receive'
  const [activeTab, setActiveTab] = useState('send')
  
  // Connection Mode: 'cloud' | 'offline'
  const [mode, setMode] = useState('cloud')
  
  // File states
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const selectedFileRef = useRef(null) // Ref mirror to avoid stale closure
  
  // QR generation/scanner scripts status
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  
  // P2P states (Sender)
  const [peerId, setPeerId] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [peerInstance, setPeerInstance] = useState(null)
  const [connectionState, setConnectionState] = useState('idle') // idle, registering, waiting, connecting, transferring, completed, error
  const connectionStateRef = useRef('idle') // Mirror of connectionState for use in closures
  const [senderProgress, setSenderProgress] = useState(0)
  const [senderSpeed, setSenderSpeed] = useState('')
  const [isBrokerConnected, setIsBrokerConnected] = useState(false)
  const activeConnRef = useRef(null)
  
  // Helper to update both state and ref atomically (avoids stale closure bugs)
  const updateConnectionState = (newState) => {
    connectionStateRef.current = newState;
    setConnectionState(newState);
  };
  
  // P2P states (Receiver)
  const [targetPeerId, setTargetPeerId] = useState('')
  const [enteredPin, setEnteredPin] = useState('')
  const [receiverProgress, setReceiverProgress] = useState(0)
  const [receiverSpeed, setReceiverSpeed] = useState('')
  const [receivedFile, setReceivedFile] = useState(null)
  const [receivedDataChunks, setReceivedDataChunks] = useState([])
  const [receivedSize, setReceivedSize] = useState(0)
  
  // UI Helpers
  const [copySuccess, setCopySuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Offline Serverless WebRTC states
  const [offlineStep, setOfflineStep] = useState(1) // 1: generate offer, 2: wait for scan/answer
  const [offlineOfferQr, setOfflineOfferQr] = useState('')
  const [offlineAnswerQr, setOfflineAnswerQr] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  // Video and Canvas refs for Camera Scanner
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)

  // Initialize scripts
  useEffect(() => {
    Promise.all([loadQrGenerator(), loadQrScanner()])
      .then(() => setScriptsLoaded(true))
      .catch((err) => {
        console.error('Failed to load dynamic scripts:', err);
        setErrorMessage('Unable to load offline QR processing libraries. Please verify network.');
      });
      
    // Check query params for auto-receive
    const params = new URLSearchParams(location.search);
    const peerParam = params.get('peer');
    if (peerParam) {
      setActiveTab('receive');
      setTargetPeerId(peerParam);
      // If we are sharing from a file tool directly
      const toolFileKey = sessionStorage.getItem('fileora_share_file_name');
      if (toolFileKey) {
        // We have active state, we'll auto-fill
      }
    }

    return () => {
      cleanupConnections();
    };
  }, []);

  // Cleanup helper
  const cleanupConnections = () => {
    if (peerInstance) {
      peerInstance.destroy();
      setPeerInstance(null);
    }
    if (activeConnRef.current) {
      activeConnRef.current.close();
      activeConnRef.current = null;
    }
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (e) {}
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }
    isProcessingOfferRef.current = false;
    stopScanning();
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      selectedFileRef.current = file;
      cleanupConnections();
      updateConnectionState('idle');
      setSenderProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      selectedFileRef.current = e.target.files[0];
      cleanupConnections();
      updateConnectionState('idle');
      setSenderProgress(0);
    }
  };

  // Trigger copy to clipboard
  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/share?peer=${peerId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Generate QR Code Local representation
  const renderQrCode = (text) => {
    if (!window.qrcode) return '';
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createImgTag(5);
    } catch (err) {
      console.error('Error generating QR:', err);
      return '';
    }
  };

  // ----------------------------------------------------
  // SENDER FLOW (Online Cloud Mode)
  // ----------------------------------------------------
  const startCloudShare = async () => {
    if (!selectedFile) return;
    
    updateConnectionState('registering');
    setErrorMessage('');
    
    try {
      const PeerClass = await loadPeerJS();
      
      // Generate secure pairing ID and 4-digit code
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
      
      peer.on('open', (id) => {
        console.log('[Sender] Registered on signaling server with ID:', id);
        setIsBrokerConnected(true);
      });
      
      peer.on('connection', (conn) => {
        console.log('[Sender] Incoming connection from receiver');
        // Only accept one connection at a time
        if (activeConnRef.current) {
          conn.close();
          return;
        }

        const handleConnOpen = () => {
          console.log('[Sender] Data channel open with receiver');
          activeConnRef.current = conn;
          updateConnectionState('connecting');
        };

        if (conn.open) {
          handleConnOpen();
        } else {
          conn.on('open', handleConnOpen);
        }
        
        conn.on('data', (data) => {
          console.log('[Sender] Received data:', typeof data, data?.type || '(binary)');
          
          // Handle both object and string formats for PAIRING_REQUEST
          let parsed = data;
          if (typeof data === 'string') {
            try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
          }
          
          if (parsed && parsed.type === 'PAIRING_REQUEST') {
            if (parsed.pin === generatedPin) {
              const file = selectedFileRef.current || selectedFile;
              console.log('[Sender] PIN verified! Starting transfer of:', file?.name);
              // PIN Verified! Notify receiver and start stream
              conn.send({ type: 'PAIRING_ACCEPTED', fileName: file.name, fileSize: file.size, fileType: file.type });
              updateConnectionState('transferring');
              
              let startTime = Date.now();
              sendFileChunks(file, conn, (offset, total) => {
                const progress = Math.min(Math.round((offset / total) * 100), 100);
                setSenderProgress(progress);
                
                if (progress === 100) {
                  updateConnectionState('completed');
                }
                
                // Calculate speed
                const elapsed = (Date.now() - startTime) / 1000;
                if (elapsed > 0.5) {
                  const speed = (offset / (1024 * 1024)) / elapsed; // MB/s
                  setSenderSpeed(`${speed.toFixed(1)} MB/s`);
                }
              });
            } else {
              console.log('[Sender] PIN rejected');
              // Invalid PIN
              conn.send({ type: 'PAIRING_REJECTED', reason: 'Invalid secure 4-digit PIN.' });
              conn.close();
              activeConnRef.current = null;
              updateConnectionState('waiting');
            }
          }
        });
        
        conn.on('close', () => {
          console.log('[Sender] Connection closed');
          activeConnRef.current = null;
          if (connectionStateRef.current !== 'completed') {
            updateConnectionState('waiting');
          }
        });
        
        conn.on('error', (err) => {
          console.error('[Sender] Connection error:', err);
        });
      });
      
      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        setErrorMessage('Failed to connect to signaling broker. Try Offline Mode.');
        updateConnectionState('error');
      });
      
    } catch (err) {
      console.error(err);
      setErrorMessage('P2P signaling error. Please try again.');
      updateConnectionState('error');
    }
  };

  // ----------------------------------------------------
  // RECEIVER FLOW (Online Cloud Mode)
  // ----------------------------------------------------
  const connectToSender = async () => {
    if (!targetPeerId || !enteredPin) {
      setErrorMessage('Please enter the Sender ID and 4-digit PIN.');
      return;
    }
    
    updateConnectionState('connecting');
    setErrorMessage('');
    setReceivedDataChunks([]);
    setReceivedSize(0);
    
    try {
      const PeerClass = await loadPeerJS();
      const localId = `fileora-rcv-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const peer = new PeerClass(localId, {
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
      
      peer.on('open', (id) => {
        console.log('[Receiver] Registered on signaling server with ID:', id);
        const conn = peer.connect(targetPeerId, { reliable: true });
        activeConnRef.current = conn;
        
        conn.on('open', () => {
          console.log('[Receiver] Data channel open! Sending pairing request...');
          // Send PIN challenge request
          conn.send({ type: 'PAIRING_REQUEST', pin: enteredPin });
        });
        
        let fileMeta = null;
        let incomingChunks = [];
        let bytesReceived = 0;
        let startTime = Date.now();

        conn.on('data', (data) => {
          console.log('[Receiver] Received data:', typeof data, data?.type || (data?.byteLength ? `binary ${data.byteLength}B` : ''));
          
          // Handle both object and string formats
          let parsed = data;
          if (typeof data === 'string') {
            try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
          }
          
          if (parsed && parsed.type === 'PAIRING_ACCEPTED') {
            console.log('[Receiver] Pairing accepted! File:', parsed.fileName, 'Size:', parsed.fileSize);
            fileMeta = parsed;
            updateConnectionState('transferring');
            startTime = Date.now();
          } else if (parsed && parsed.type === 'PAIRING_REJECTED') {
            setErrorMessage(parsed.reason);
            updateConnectionState('error');
            conn.close();
          } else if (
            (typeof parsed === 'string' && parsed.includes('TRANSFER_COMPLETE')) ||
            (parsed && parsed.type === 'TRANSFER_COMPLETE')
          ) {
            console.log('[Receiver] Transfer complete! Reassembling', incomingChunks.length, 'chunks,', bytesReceived, 'bytes');
            // Reassemble the file
            const blob = new Blob(incomingChunks, { type: fileMeta?.fileType || 'application/octet-stream' });
            const fileUrl = URL.createObjectURL(blob);
            
            setReceivedFile({
              name: fileMeta?.fileName || 'received-file',
              size: fileMeta?.fileSize || bytesReceived,
              url: fileUrl
            });
            
            updateConnectionState('completed');
            
            // Auto download file
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = fileMeta?.fileName || 'received-file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            conn.close();
            peer.destroy();
          } else {
            // Binary chunk received
            incomingChunks.push(data);
            bytesReceived += (data.byteLength || data.size || data.length || 0);
            
            if (fileMeta) {
              const progress = Math.min(Math.round((bytesReceived / fileMeta.fileSize) * 100), 100);
              setReceiverProgress(progress);
              
              const elapsed = (Date.now() - startTime) / 1000;
              if (elapsed > 0.5) {
                const speed = (bytesReceived / (1024 * 1024)) / elapsed; // MB/s
                setReceiverSpeed(`${speed.toFixed(1)} MB/s`);
              }
            }
          }
        });
        
        conn.on('close', () => {
          console.log('[Receiver] Connection closed');
          if (connectionStateRef.current !== 'completed') {
            setErrorMessage('Connection closed by sender.');
            updateConnectionState('error');
          }
        });
        
        conn.on('error', (err) => {
          console.error('[Receiver] Connection error:', err);
          setErrorMessage('Handshake connection failed. Check ID and PIN.');
          updateConnectionState('error');
        });
      });
      
      peer.on('error', (err) => {
        console.error(err);
        setErrorMessage('Failed to connect to signaling cloud.');
        updateConnectionState('error');
      });
      
    } catch (err) {
      console.error(err);
      setErrorMessage('P2P loading failed.');
      updateConnectionState('error');
    }
  };

  // ----------------------------------------------------
  // SERVERLESS OFFLINE WEBRTC FLOW (QR-to-QR Handshake)
  // ----------------------------------------------------
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const isProcessingOfferRef = useRef(false);

  const startOfflineSender = async () => {
    if (!selectedFile) return;
    updateConnectionState('connecting');
    setErrorMessage('');
    setOfflineStep(1);
    
    try {
      const RTCPeerConnectionClass = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!RTCPeerConnectionClass) {
        throw new Error('Direct WebRTC sharing requires a Secure Context (HTTPS or localhost). Please ensure your connection is secure.');
      }
      const pc = new RTCPeerConnectionClass({
        iceServers: []
      });
      pcRef.current = pc;
      
      const dc = pc.createDataChannel('fileora-offline-transfer', { ordered: true });
      dataChannelRef.current = dc;
      
      dc.onopen = () => {
        updateConnectionState('transferring');
        let startTime = Date.now();
        sendFileChunks(selectedFile, dc, (offset, total) => {
          const progress = Math.min(Math.round((offset / total) * 100), 100);
          setSenderProgress(progress);
          
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0.5) {
            const speed = (offset / (1024 * 1024)) / elapsed;
            setSenderSpeed(`${speed.toFixed(1)} MB/s`);
          }
        });
      };
      
      dc.onclose = () => {
        if (connectionStateRef.current !== 'completed') {
          updateConnectionState('idle');
        }
      };

      let iceHandled = false;
      const handleIceComplete = async () => {
        if (iceHandled) return;
        iceHandled = true;
        const offer = pc.localDescription;
        const compressed = await compressSDP({
          type: offer.type,
          sdp: offer.sdp,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        });
        setOfflineOfferQr(compressed);
        setOfflineStep(2);
      };

      pc.onicegatheringstatechange = async () => {
        if (pc.iceGatheringState === 'complete') {
          await handleIceComplete();
        }
      };
      
      pc.onicecandidate = async (event) => {
        if (!event.candidate) {
          await handleIceComplete();
        }
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (pc.iceGatheringState === 'complete') {
        await handleIceComplete();
      }
      
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to configure serverless local WebRTC session.');
    }
  };

  const handleScanOffer = async (scannedOfferBase64) => {
    if (isProcessingOfferRef.current || pcRef.current) {
      return;
    }
    isProcessingOfferRef.current = true;
    
    try {
      stopScanning();
      updateConnectionState('connecting');
      
      const offerData = await decompressSDP(scannedOfferBase64);
      
      if (pcRef.current) {
        isProcessingOfferRef.current = false;
        return;
      }
      
      const RTCPeerConnectionClass = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!RTCPeerConnectionClass) {
        throw new Error('Direct WebRTC sharing requires a Secure Context (HTTPS or localhost). Please ensure your connection is secure.');
      }
      const pc = new RTCPeerConnectionClass({
        iceServers: []
      });
      pcRef.current = pc;
      
      let incomingChunks = [];
      let bytesReceived = 0;
      let startTime = Date.now();

      pc.ondatachannel = (event) => {
        const dc = event.channel;
        dataChannelRef.current = dc;
        
        dc.onmessage = (e) => {
          const data = e.data;
          if (data && typeof data === 'string' && data.includes('TRANSFER_COMPLETE')) {
            const blob = new Blob(incomingChunks, { type: offerData.fileType });
            const fileUrl = URL.createObjectURL(blob);
            setReceivedFile({
              name: offerData.fileName,
              size: offerData.fileSize,
              url: fileUrl
            });
            updateConnectionState('completed');
            
            // Auto download file
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = offerData.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            cleanupConnections();
          } else {
            incomingChunks.push(data);
            bytesReceived += data.byteLength;
            
            const progress = Math.min(Math.round((bytesReceived / offerData.fileSize) * 100), 100);
            setReceiverProgress(progress);
            
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0.5) {
              const speed = (bytesReceived / (1024 * 1024)) / elapsed;
              setReceiverSpeed(`${speed.toFixed(1)} MB/s`);
            }
          }
        };
        
        dc.onopen = () => {
          updateConnectionState('transferring');
          startTime = Date.now();
        };
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: offerData.type,
        sdp: offerData.sdp
      }));
      
      let iceHandled = false;
      const handleIceComplete = async () => {
        if (iceHandled) return;
        iceHandled = true;
        const answer = pc.localDescription;
        const compressed = await compressSDP({
          type: answer.type,
          sdp: answer.sdp
        });
        setOfflineAnswerQr(compressed);
        setOfflineStep(3); // Receiver displays answer QR, Sender scans it
        isProcessingOfferRef.current = false;
      };

      pc.onicegatheringstatechange = async () => {
        if (pc.iceGatheringState === 'complete') {
          await handleIceComplete();
        }
      };

      pc.onicecandidate = async (event) => {
        if (!event.candidate) {
          await handleIceComplete();
        }
      };
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (pc.iceGatheringState === 'complete') {
        await handleIceComplete();
      }
      
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to decode Connection Offer. Ensure it is correct QR.');
      isProcessingOfferRef.current = false;
      updateConnectionState('error');
    }
  };

  const handleScanAnswer = async (scannedAnswerBase64) => {
    // Only accept connection answer if we have an active offer and are waiting for it
    if (!pcRef.current || pcRef.current.signalingState !== 'have-local-offer') {
      return;
    }
    
    try {
      stopScanning();
      const answerData = await decompressSDP(scannedAnswerBase64);
      
      // Re-verify peer connection status after async decompression
      if (pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerData));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to apply Connection Answer.');
    }
  };

  // Camera QR Scanner Loop logic
  const startCameraScan = async (isScanningOffer = true) => {
    setIsScanning(true);
    setErrorMessage('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Delay scanning slightly to let video load frames
      setTimeout(() => {
        scanIntervalRef.current = setInterval(() => {
          if (videoRef.current && canvasRef.current && window.jsQR) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.height = video.videoHeight;
              canvas.width = video.videoWidth;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });
              
              if (code && code.data) {
                if (isScanningOffer) {
                  handleScanOffer(code.data);
                } else {
                  handleScanAnswer(code.data);
                }
              }
            }
          }
        }, 300);
      }, 1000);
      
    } catch (err) {
      console.error('Camera access failed:', err);
      setErrorMessage('Unable to access camera device. Ensure permissions are allowed.');
      setIsScanning(false);
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
            <h1 className="h1-premium" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Direct Local File Share</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', maxWidth: '500px', margin: '0 auto' }}>
              Files stream natively from memory to memory. 100% private, fully encrypted, with zero server storage.
            </p>
          </div>

          {/* Main Panel Card */}
          <div className="glass-card-premium" style={{ padding: '2rem', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Mode selection tabs */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.5)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <button 
                className={`tab-button-premium ${activeTab === 'send' ? 'active' : ''}`}
                onClick={() => { setActiveTab('send'); setErrorMessage(''); }}
                style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}
              >
                Send Files
              </button>
              <button 
                className={`tab-button-premium ${activeTab === 'receive' ? 'active' : ''}`}
                onClick={() => { setActiveTab('receive'); setErrorMessage(''); }}
                style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}
              >
                Receive Files
              </button>
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
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
                        onClick={() => { setSelectedFile(null); selectedFileRef.current = null; cleanupConnections(); updateConnectionState('idle'); }}
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Network Mode Selection */}
                    {connectionState === 'idle' && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network Discovery Mode</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setMode('cloud')}
                            className={`mode-btn ${mode === 'cloud' ? 'active' : ''}`}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            <Wifi size={16} />
                            <span>Cloud Mode (Online)</span>
                          </button>
                          <button 
                            onClick={() => setMode('offline')}
                            className={`mode-btn ${mode === 'offline' ? 'active' : ''}`}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            <WifiOff size={16} />
                            <span>Local Offline (Same Hotspot)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ACTION INTERFACES */}
                    
                    {/* IDLE: Trigger cloud / offline sharing */}
                    {connectionState === 'idle' && (
                      <button 
                        onClick={mode === 'cloud' ? startCloudShare : startOfflineSender}
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

                    {connectionState === 'waiting' && mode === 'cloud' && (
                      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* QR Code Card */}
                          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block' }} 
                            dangerouslySetInnerHTML={{ __html: renderQrCode(`${window.location.origin}/share?peer=${peerId}`) }}>
                          </div>
                          
                          {/* Credentials Panel */}
                          <div style={{ textAlign: 'left', flex: 1, minWidth: '250px' }}>
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
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isBrokerConnected ? '#10b981' : '#f59e0b', display: 'inline-block', boxShadow: isBrokerConnected ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} className="glowing-pulse"></span>
                              <span>{isBrokerConnected ? 'Pairing active. Keep this screen open!' : 'Establishing secure channel...'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SENDER OFFLINE QR EXCHANGE SCREEN */}
                    {mode === 'offline' && connectionState === 'connecting' && (
                      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        {offlineStep === 1 && (
                          <div>
                            <RefreshCw className="spinning" size={32} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                            <h3>Compiling Air-Gapped WebRTC Offer...</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Generating local ICE descriptors.</p>
                          </div>
                        )}
                        
                        {offlineStep === 2 && (
                          <div>
                            <h3 style={{ marginBottom: '1rem' }}>Offline Share: Handshake Offer</h3>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }} 
                              dangerouslySetInnerHTML={{ __html: renderQrCode(offlineOfferQr) }}>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <button onClick={() => { navigator.clipboard.writeText(offlineOfferQr); alert('Connection Code copied!'); }} className="btn-premium btn-premium-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}>
                                <Copy size={12} />
                                <span>Copy Connection Code</span>
                              </button>
                            </div>
                            <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                <strong>1.</strong> On the Receiver device, choose <strong>Receive Files</strong> &rarr; <strong>Offline</strong>.
                              </p>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                <strong>2.</strong> Scan this QR code OR paste the copied **Connection Code** into the input box.
                              </p>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <strong>3.</strong> Scan the Receiver's screen OR paste their **Response Code** below to connect!
                              </p>
                            </div>
                            
                            {!isScanning ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '400px', margin: '0 auto' }}>
                                <button 
                                  onClick={() => startCameraScan(false)}
                                  className="btn-premium btn-premium-primary"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer' }}
                                >
                                  <Camera size={18} />
                                  <span>Scan Receiver's Screen</span>
                                </button>
                                
                                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', textAlign: 'left' }}>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or Paste Receiver's Response Code</label>
                                  <textarea 
                                    placeholder="Paste Receiver's 800-character Response Code here..."
                                    onChange={(e) => {
                                      const val = e.target.value.trim();
                                      if (val.length > 50) {
                                        handleScanAnswer(val);
                                      }
                                    }}
                                    style={{ width: '100%', height: '70px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', fontSize: '11px', color: 'var(--text-primary)', resize: 'none', fontFamily: 'monospace' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop: '1.5rem' }}>
                                <div style={{ position: 'relative', width: '100%', maxWidth: '300px', height: '220px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px', border: '2px solid var(--accent-primary)' }}>
                                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                                </div>
                                <button onClick={stopScanning} className="btn-premium btn-premium-secondary" style={{ marginTop: '10px', padding: '6px 12px', fontSize: '12px' }}>
                                  Cancel Scan
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SENDER / RECEIVER STREAM PROGRESS MODULE */}
                    {(connectionState === 'transferring' || connectionState === 'connecting') && (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem' }}>
                          {/* Pulsing ring background */}
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '4px solid rgba(59, 130, 246, 0.1)', zIndex: 1 }} />
                          {/* Glowing circular progress */}
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
                        <button 
                          onClick={() => { setSelectedFile(null); selectedFileRef.current = null; cleanupConnections(); updateConnectionState('idle'); setSenderProgress(0); }} 
                          className="btn-premium btn-premium-secondary"
                          style={{ padding: '10px 24px', borderRadius: '8px' }}
                        >
                          Share Another File
                        </button>
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
                    {/* Network Mode Selection */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Mode</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => setMode('cloud')}
                          className={`mode-btn ${mode === 'cloud' ? 'active' : ''}`}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          <Wifi size={16} />
                          <span>Auto Connect (Online)</span>
                        </button>
                        <button 
                          onClick={() => setMode('offline')}
                          className={`mode-btn ${mode === 'offline' ? 'active' : ''}`}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          <WifiOff size={16} />
                          <span>Local Offline (Same Hotspot)</span>
                        </button>
                      </div>
                    </div>

                    {/* ONLINE CLOUD LOGIN PANEL */}
                    {mode === 'cloud' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>SENDER CHANNEL ID</label>
                        <input 
                          type="text" 
                          placeholder="e.g. fileora-7a2x..."
                          value={targetPeerId}
                          onChange={(e) => setTargetPeerId(e.target.value)}
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
                          onClick={connectToSender}
                          className="btn-premium btn-premium-primary"
                          style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '15px' }}
                        >
                          Connect & Request Stream
                        </button>
                      </div>
                    )}

                    {/* OFFLINE HANDSHAKE INTERFACES (RECEIVER) */}
                    {mode === 'offline' && (
                      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <h3>Local Offline Handshake (Receiver)</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                          Connect locally to another device on your hotspot. No server signaling needed!
                        </p>
                        
                        {!isScanning ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px', margin: '0 auto' }}>
                            <button 
                              onClick={() => startCameraScan(true)}
                              className="btn-premium btn-premium-primary"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 28px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              <Camera size={18} />
                              <span>Scan Sender's Screen</span>
                            </button>
                            
                            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', textAlign: 'left' }}>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or Paste Sender's Connection Code</label>
                              <textarea 
                                placeholder="Paste Sender's 800-character Connection Code here..."
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  if (val.length > 50) {
                                    handleScanOffer(val);
                                  }
                                }}
                                style={{ width: '100%', height: '80px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', fontSize: '11px', color: 'var(--text-primary)', resize: 'none', fontFamily: 'monospace' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', height: '220px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px', border: '2px solid var(--accent-primary)' }}>
                              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <canvas ref={canvasRef} style={{ display: 'none' }} />
                            </div>
                            <button onClick={stopScanning} className="btn-premium btn-premium-secondary" style={{ marginTop: '10px', padding: '6px 12px', fontSize: '12px' }}>
                              Cancel Camera Scan
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* OFFLINE RECEIVER ANSWER DISPLAY STAGE */}
                {mode === 'offline' && connectionState === 'connecting' && offlineStep === 3 && (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Generate Connection Response</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                      SDP mapped successfully! Display this response to the Sender to connect.
                    </p>
                    
                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }} 
                      dangerouslySetInnerHTML={{ __html: renderQrCode(offlineAnswerQr) }}>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <button onClick={() => { navigator.clipboard.writeText(offlineAnswerQr); alert('Response Code copied!'); }} className="btn-premium btn-premium-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}>
                        <Copy size={12} />
                        <span>Copy Response Code</span>
                      </button>
                    </div>

                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="glowing-pulse"></span>
                      <span>Now point the Sender's camera at this screen OR paste this Response Code on the Sender's screen!</span>
                    </div>
                  </div>
                )}

                {/* RECEIVING PROGRESS RING */}
                {(connectionState === 'transferring' || (connectionState === 'connecting' && mode === 'cloud')) && (
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
                        onClick={() => { setReceivedFile(null); cleanupConnections(); updateConnectionState('idle'); setReceiverProgress(0); }} 
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
                  onClick={() => { cleanupConnections(); updateConnectionState('idle'); setSenderProgress(0); setReceiverProgress(0); }} 
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

        </div>
      </main>

      <Footer />
    </div>
  )
}
