/**
 * Fileora P2P Engine — Simple PeerJS (uses 0.peerjs.com free cloud)
 * Files go browser → browser. Zero server storage. DTLS encrypted.
 */
import Peer from 'peerjs';

export const CHUNK_SIZE = 64 * 1024; // 64 KB chunks

export const makePeerId = () =>
  `fileora-${Math.floor(10000 + Math.random() * 90000)}`;

export const makePin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

/** Create a PeerJS instance using the default 0.peerjs.com cloud server */
export const createPeer = (peerId) => {
  const opts = {
    host: '0.peerjs.com',
    secure: true,
    port: 443,
    debug: 2,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
    },
  };
  return peerId ? new Peer(peerId, opts) : new Peer(opts);
};

/** Wait for peer to open (get an ID from the signaling server) */
export const waitForPeerOpen = (peer, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    if (peer.open) { resolve(peer.id); return; }
    const timer = setTimeout(() => {
      peer.off('open', onOpen);
      peer.off('error', onError);
      reject(new Error('Could not connect to signaling server (20s). Check your internet.'));
    }, timeoutMs);
    const onOpen = (id) => { clearTimeout(timer); peer.off('error', onError); resolve(id); };
    const onError = (err) => { clearTimeout(timer); peer.off('open', onOpen); reject(err); };
    peer.on('open', onOpen);
    peer.on('error', onError);
  });

/** Wait for a DataConnection to be open */
export const waitForConnOpen = (conn, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    if (conn.open) { resolve(conn); return; }
    const timer = setTimeout(() => {
      conn.off('open', onOpen);
      conn.off('error', onError);
      reject(new Error('Peer not reachable. Keep the sender screen open and verify the ID.'));
    }, timeoutMs);
    const onOpen = () => { clearTimeout(timer); conn.off('error', onError); resolve(conn); };
    const onError = (err) => { clearTimeout(timer); conn.off('open', onOpen); reject(err); };
    conn.on('open', onOpen);
    conn.on('error', onError);
  });

/** Stream file in chunks over a PeerJS DataConnection or raw RTCDataChannel with backpressure control */
export const sendFileChunks = (file, conn, onProgress, onStatus) => {
  const channel = conn.dataChannel || conn; // If PeerJS, conn.dataChannel. If raw RTCDataChannel, conn itself.
  const isPeerJS = !!conn.dataChannel;
  const fileSize = file.size;

  // Dynamic chunk sizing based on file size:
  // - > 500 MB: 256 KB chunks
  // - > 100 MB: 128 KB chunks
  // - Otherwise: 64 KB chunks
  const chunkSize = fileSize > 500 * 1024 * 1024 
    ? 256 * 1024 
    : (fileSize > 100 * 1024 * 1024 ? 128 * 1024 : 64 * 1024);

  const reader = new FileReader();
  let offset = 0;
  let paused = false;

  const BACKPRESSURE_THRESHOLD = 1024 * 1024; // 1 MB high threshold
  const LOW_THRESHOLD = 256 * 1024; // 256 KB low threshold

  if (channel) {
    channel.bufferedAmountLowThreshold = LOW_THRESHOLD;
    channel.onbufferedamountlow = () => {
      if (paused) {
        paused = false;
        if (onStatus) onStatus('Streaming chunks (buffer drained)...');
        next();
      }
    };
  }

  const sendMsg = (msg) => {
    if (isPeerJS) {
      conn.send(msg);
    } else {
      if (typeof msg === 'object' && !(msg instanceof ArrayBuffer) && !(msg instanceof Blob) && !ArrayBuffer.isView(msg)) {
        channel.send(JSON.stringify(msg));
      } else {
        channel.send(msg);
      }
    }
  };

  const next = () => {
    const isOpen = isPeerJS ? conn.open : (channel && channel.readyState === 'open');
    if (!isOpen) return;

    if (channel && channel.bufferedAmount > BACKPRESSURE_THRESHOLD) {
      paused = true;
      if (onStatus) onStatus('Throttling transfer (network buffer full)...');
      return;
    }

    reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
  };

  reader.onload = (e) => {
    const buf = e.target.result;
    if (!buf) return;

    try {
      sendMsg(buf);
      offset += buf.byteLength;
      onProgress(offset, fileSize);

      if (offset < fileSize) {
        next();
      } else {
        sendMsg({ type: 'TRANSFER_COMPLETE' });
        onProgress(fileSize, fileSize);
        if (onStatus) onStatus('Transfer complete!');
      }
    } catch (err) {
      console.error('[P2P] Send error:', err);
      if (onStatus) onStatus('Error sending chunk.');
    }
  };

  reader.onerror = (e) => {
    console.error('[P2P] FileReader error', e);
    if (onStatus) onStatus('File read error.');
  };

  if (onStatus) onStatus('Pipelining chunks...');
  next();
};

/** Create a raw WebRTC RTCPeerConnection for offline direct sharing */
export const createPeerConnection = () => {
  const RTCPeerConnectionClass = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  if (!RTCPeerConnectionClass) {
    throw new Error('WebRTC not supported in this browser.');
  }
  return new RTCPeerConnectionClass({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  });
};

/** Wait for ICE candidate gathering process to complete */
export const waitForIceComplete = (pc, timeoutMs = 8000) =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return; }
    
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      pc.onicecandidate = null;
      pc.removeEventListener('icegatheringstatechange', onStateChange);
    };

    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        cleanup();
        resolve();
      }
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        cleanup();
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', onStateChange);
  });

export const normalizePeerId = (raw) => {
  const input = (raw || '').trim();
  if (!input) return '';
  try {
    const url = input.includes('://')
      ? new URL(input)
      : input.includes('?') ? new URL(input, window.location.origin) : null;
    if (url) {
      const fromQ = url.searchParams.get('peer');
      if (fromQ) return fromQ.trim();
    }
  } catch { /* not a URL */ }
  const withoutQuery = input.split('?')[0];
  const segs = withoutQuery.split('/').filter(Boolean);
  return (segs[segs.length - 1] || input).trim();
};

// ─── SDP helpers (offline mode only) ─────────────────────────────────────────
export const compressSDP = async (sdp) => {
  const str = JSON.stringify(sdp);
  if (typeof CompressionStream !== 'undefined') {
    try {
      const blob = new Blob([str]);
      const cs = new CompressionStream('gzip');
      const buf = await new Response(blob.stream().pipeThrough(cs)).arrayBuffer();
      let b = '';
      new Uint8Array(buf).forEach((v) => { b += String.fromCharCode(v); });
      return btoa(b);
    } catch { /* fallback */ }
  }
  return btoa(unescape(encodeURIComponent(str)));
};

export const decompressSDP = async (b64) => {
  const cleaned = (b64 || '').trim().replace(/\s/g, '');
  if (!cleaned) throw new Error('Empty connection code.');
  try {
    const bin = atob(cleaned);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream !== 'undefined') {
      const blob = new Blob([bytes]);
      return JSON.parse(await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }
  } catch { /* try plain */ }
  try { return JSON.parse(decodeURIComponent(escape(atob(cleaned)))); }
  catch { throw new Error('Invalid connection code.'); }
};
