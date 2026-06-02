/**
 * Fileora P2P sharing engine
 * High-performance WebRTC engine supporting:
 * 1. Online Mode via PeerJS Cloud signaling
 * 2. 100% Offline Local Mode via Serverless QR-to-QR SDP exchange
 */

// 1. Dynamic CDN Loader for PeerJS
export const loadPeerJS = async () => {
  if (window.Peer) return window.Peer;

  return new Promise((resolve, reject) => {
    if (window.Peer) {
      resolve(window.Peer);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.Peer) {
        resolve(window.Peer);
      } else {
        reject(new Error('PeerJS not found on window object after load.'));
      }
    };
    script.onerror = (err) => {
      console.error('Failed to load PeerJS script:', err);
      reject(new Error('Failed to load PeerJS library. Check network and COEP/CSP headers.'));
    };
    document.head.appendChild(script);
  });
};

// 2. Native Gzip Compression for Serverless SDPs
// This shrinks SDP from ~3.5KB to ~800 bytes so it fits perfectly in clean QR codes!
export const compressSDP = async (sdpObj) => {
  const jsonStr = JSON.stringify(sdpObj);
  const blob = new Blob([jsonStr], { type: 'text/plain' });
  
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const buffer = await new Response(stream).arrayBuffer();
      // Convert ArrayBuffer to Base64 safely
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (e) {
      console.warn('Native Gzip compression failed, falling back to base64 JSON:', e);
    }
  }
  
  // Fallback to plain base64 encoding if CompressionStream is not supported
  return btoa(unescape(encodeURIComponent(jsonStr)));
};

export const decompressSDP = async (compressedBase64) => {
  try {
    const binaryStr = atob(compressedBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    if (typeof DecompressionStream !== 'undefined') {
      const blob = new Blob([bytes]);
      const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(stream).text();
      return JSON.parse(text);
    }
  } catch (e) {
    console.warn('Decompression failed, trying raw base64 fallback:', e);
  }

  // Fallback
  try {
    const rawJson = decodeURIComponent(escape(atob(compressedBase64)));
    return JSON.parse(rawJson);
  } catch (err) {
    throw new Error('Failed to decompress connection metadata.');
  }
};

// 3. WebRTC Data Channel Chunking Config
export const CHUNK_SIZE = 16384; // 16KB WebRTC packet limit (safe for iOS/Android/Chrome)

/**
 * Sends a file over a WebRTC Data Channel with progressive progress logging.
 * Supports both PeerJS DataConnection (online) and native RTCDataChannel (offline).
 */
export const sendFileChunks = async (file, dataChannel, onProgress) => {
  const fileReader = new FileReader();
  let offset = 0;
  
  // Detect if this is a PeerJS DataConnection or native RTCDataChannel
  const isPeerJS = typeof dataChannel.readyState === 'undefined' || typeof dataChannel.readyState !== 'string';
  
  const isChannelOpen = () => {
    if (isPeerJS) {
      return dataChannel.open === true;
    }
    return dataChannel.readyState === 'open';
  };
  
  const getBufferedAmount = () => {
    if (!isPeerJS && dataChannel.bufferedAmount !== undefined) {
      return dataChannel.bufferedAmount;
    }
    // PeerJS DataConnection: try to access underlying data channel
    try {
      if (dataChannel._dc && dataChannel._dc.bufferedAmount !== undefined) {
        return dataChannel._dc.bufferedAmount;
      }
      if (dataChannel.dataChannel && dataChannel.dataChannel.bufferedAmount !== undefined) {
        return dataChannel.dataChannel.bufferedAmount;
      }
    } catch (e) {}
    return 0;
  };

  const sendNextChunk = () => {
    if (!isChannelOpen()) {
      console.warn('Data channel closed while sending chunks at offset:', offset);
      return;
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    fileReader.readAsArrayBuffer(slice);
  };

  fileReader.onload = (e) => {
    const buffer = e.target.result;
    
    // Check bufferedAmount to avoid overwhelming the WebRTC socket buffer
    const buffered = getBufferedAmount();
      
    if (buffered > 8 * 1024 * 1024) { // 8MB safety threshold
      setTimeout(() => fileReader.onload(e), 100);
      return;
    }

    try {
      dataChannel.send(buffer);
    } catch (err) {
      console.error('Failed to send chunk at offset:', offset, err);
      return;
    }
    
    offset += buffer.byteLength;
    onProgress(offset, file.size);

    if (offset < file.size) {
      sendNextChunk();
    } else {
      // Send a complete signal string to tell receiver transfer is complete
      try {
        dataChannel.send(JSON.stringify({ type: 'TRANSFER_COMPLETE' }));
      } catch (err) {
        console.error('Failed to send TRANSFER_COMPLETE signal:', err);
      }
    }
  };

  fileReader.onerror = (err) => {
    console.error('FileReader error while reading chunk at offset:', offset, err);
  };

  // Start sending
  sendNextChunk();
};
