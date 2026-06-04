import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Video, Download, Play, Scissors, AlertTriangle, Clock } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { trimVideo } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';
import SecureShareButton from '../components/shared/SecureShareButton';

export default function TrimVideo() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);

  // Settings
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startInput, setStartInput] = useState('00:00.00');
  const [endInput, setEndInput] = useState('00:00.00');
  const [tempUrl, setTempUrl] = useState('');

  const videoRef = useRef(null);

  useEffect(() => {
    clearOPFSSandbox();
  }, []);

  useEffect(() => {
    return () => {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    };
  }, [tempUrl]);

  // Convert float seconds to HH:MM:SS.SS or MM:SS.SS
  const secondsToTimestamp = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);

    const pad = (n, width = 2) => n.toString().padStart(width, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
  };

  // Convert timestamp to float seconds
  const timestampToSeconds = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.trim().split(':');
    let seconds = 0;

    if (parts.length === 3) {
      // HH:MM:SS
      const h = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const s = parseFloat(parts[2]) || 0;
      seconds = h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      // MM:SS
      const m = parseFloat(parts[0]) || 0;
      const s = parseFloat(parts[1]) || 0;
      seconds = m * 60 + s;
    } else if (parts.length === 1) {
      // SS.SS
      seconds = parseFloat(parts[0]) || 0;
    }

    return isNaN(seconds) ? 0 : seconds;
  };

  const handleFileSelect = async (filesList) => {
    const selected = filesList[0];
    if (!selected) return;

    if (!selected.type.startsWith('video/') && !selected.name.toLowerCase().endsWith('.mov')) {
      setError('Please upload a valid video file.');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg('Buffering video to local sandbox disk space...');
    setProgressPercent(0);
    setResultUrl('');

    try {
      await clearOPFSSandbox();
      await saveToOPFS('input_trim.mp4', selected);
      
      const localUrl = URL.createObjectURL(selected);
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      setTempUrl(localUrl);
      setFile(selected);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to buffer video file. Please try a smaller file.');
      setProcessing(false);
    }
  };

  const handleVideoMetadataLoaded = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setStartTime(0);
      setEndTime(videoDuration);
      setStartInput(secondsToTimestamp(0));
      setEndInput(secondsToTimestamp(videoDuration));
    }
  };

  const handleTrim = async () => {
    if (!file) return;
    if (startTime >= endTime) {
      setError('Start time must be strictly less than end time.');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg('Initializing WebAssembly engine...');
    setProgressPercent(0);

    try {
      await trimVideo('input_trim.mp4', 'output_trimmed.mp4', startTime, endTime, ({ message, progress }) => {
        if (message) setProgressMsg(message);
        if (progress !== undefined) setProgressPercent(progress);
      });

      const outFile = await getFromOPFS('output_trimmed.mp4');
      const url = URL.createObjectURL(outFile);
      
      setResultBlob(outFile);
      setResultUrl(url);
      setResultSize(outFile.size);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Trimming failed. Make sure SharedArrayBuffers are active.');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    if (tempUrl) {
      URL.revokeObjectURL(tempUrl);
      setTempUrl('');
    }
    setFile(null);
    setResultUrl('');
    setResultBlob(null);
    setError('');
    setProcessing(false);
    setStartTime(0);
    setEndTime(0);
    setStartInput('00:00.00');
    setEndInput('00:00.00');
    clearOPFSSandbox();
  };

  const handleStartInputChange = (val) => {
    setStartInput(val);
    const secs = timestampToSeconds(val);
    if (!isNaN(secs) && secs >= 0 && secs <= endTime) {
      setStartTime(secs);
      if (videoRef.current) videoRef.current.currentTime = secs;
    }
  };

  const handleEndInputChange = (val) => {
    setEndInput(val);
    const secs = timestampToSeconds(val);
    if (!isNaN(secs) && secs >= startTime && secs <= duration) {
      setEndTime(secs);
      if (videoRef.current) videoRef.current.currentTime = secs;
    }
  };

  const handleStartInputBlur = () => {
    setStartInput(secondsToTimestamp(startTime));
  };

  const handleEndInputBlur = () => {
    setEndInput(secondsToTimestamp(endTime));
  };

  const setStartToCurrent = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const bounded = Math.min(current, endTime);
      setStartTime(bounded);
      setStartInput(secondsToTimestamp(bounded));
    }
  };

  const setEndToCurrent = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const bounded = Math.max(startTime, Math.min(current, duration));
      setEndTime(bounded);
      setEndInput(secondsToTimestamp(bounded));
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Trim Video Online — Cut &amp; Slice Video Clips | Fileora</title>
        <meta name="description" content="Trim and cut video files online for free. Precise client-side video cutter—slice MP4, MOV, or WebM clips locally in-browser with zero limits." />
        <link rel="canonical" href="https://fileora.tech/trim-video" data-rh="true" />
        <meta property="og:title" content="Trim Video Online — Cut &amp; Slice Video Clips | Fileora" />
        <meta property="og:description" content="Trim and cut video files online for free. Precise client-side video cutter—slice MP4, MOV, or WebM clips locally in-browser with zero limits." />
        <meta property="og:url" content="https://fileora.tech/trim-video" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Trim Video Online — Cut &amp; Slice Video Clips | Fileora" />
        <meta name="twitter:description" content="Trim and cut video files online for free. Precise client-side video cutter—slice MP4, MOV, or WebM clips locally in-browser with zero limits." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>Video Trimming Tool</h1>
          <p>Cut and slice specific portions of your videos offline. Set start/end boundaries on a precise frame player—ideal for clipping social uploads or extracting key segments with zero cloud logging.</p>
        </section>

        <section className="container tool-description-section">
          {error && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderColor: 'var(--danger)', padding: '1rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.05)' }}>
              <AlertTriangle color="var(--danger)" size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{error}</div>
            </div>
          )}

          {processing ? (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="loading-spinner" style={{ width: '40px', height: '40px' }} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{progressMsg}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extracting video slice frame-by-frame client-side... keep this tab active.</p>
              </div>
              {progressPercent > 0 && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Slicing</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}
            </div>
          ) : resultUrl ? (
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
                  <ArrowLeft size={16} /> Cut Another Video
                </button>
                <div className="badge">
                  <Shield size={12} style={{ marginRight: '4px' }} /> Processed Offline
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <video src={resultUrl} controls style={{ width: '100%', maxHeight: '400px', display: 'block' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name.replace(/\.[^/.]+$/, '')}-trimmed.mp4</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)} · Duration: {(endTime - startTime).toFixed(2)}s</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={resultUrl} download={`${file.name.replace(/\.[^/.]+$/, '')}-trimmed.mp4`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <Download size={18} /> Download Trimmed Video
                  </a>
                  {resultBlob && (
                    <SecureShareButton 
                      file={resultBlob} 
                      fileName={`${file.name.replace(/\.[^/.]+$/, '')}-trimmed.mp4`} 
                      style={{ padding: '10px 20px' }}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : file ? (
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
                  <ArrowLeft size={16} /> Choose Different Video
                </button>
                <div className="badge">
                  <Scissors size={12} style={{ marginRight: '4px' }} /> Cut Workspace
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <video
                  ref={videoRef}
                  src={tempUrl}
                  onLoadedMetadata={handleVideoMetadataLoaded}
                  controls
                  style={{ width: '100%', maxHeight: '360px', display: 'block' }}
                />
              </div>

              {/* Time Configuration Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {/* Start Time Config */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Clock size={14} color="var(--accent-primary)" /> Start Timestamp
                  </div>
                  <input
                    type="text"
                    placeholder="00:00.00"
                    value={startInput}
                    onChange={(e) => handleStartInputChange(e.target.value)}
                    onBlur={handleStartInputBlur}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    <span>Parsed: {startTime.toFixed(2)}s</span>
                    <span>Format: MM:SS.SS</span>
                  </div>
                  <button
                    type="button"
                    onClick={setStartToCurrent}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = '#000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    📍 Use Current Position
                  </button>
                </div>

                {/* End Time Config */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Clock size={14} color="var(--accent-primary)" /> End Timestamp
                  </div>
                  <input
                    type="text"
                    placeholder="00:00.00"
                    value={endInput}
                    onChange={(e) => handleEndInputChange(e.target.value)}
                    onBlur={handleEndInputBlur}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    <span>Parsed: {endTime.toFixed(2)}s</span>
                    <span>Format: MM:SS.SS</span>
                  </div>
                  <button
                    type="button"
                    onClick={setEndToCurrent}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      padding: '8px 10px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = '#000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    📍 Use Current Position
                  </button>
                </div>
              </div>

              {/* Range Preview Badge */}
              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Trimmed Clip Length: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{(endTime - startTime).toFixed(2)}s</span> (Out of {duration.toFixed(2)}s total)
              </div>

              <button onClick={handleTrim} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                <Scissors size={16} /> Cut &amp; Slice Video
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept="video/*"
              maxSizeLabel=""
              helpText="Precisely cut, slice, and trim video segments locally."
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>Precise Frame Slicing and Lossless Cutting</h2>
          <p className="tool-description-para">
            Trimming large video recording payloads into short highlight clips, specific segments, or removing dead space is extremely standard for social sharing, presentations, or documentation. Fileora parses and cuts your video streams directly within your browser session using high-speed WebAssembly engines.
          </p>
          <p className="tool-description-para-last">
            Our dynamic routing algorithm attempts a **lossless stream split** first. By copying original H.264 video track packages without transcode calculations, clipping is finalized in a fraction of a second with zero visual resolution degradation. Fallbacks trigger only if mismatched stream properties require precise re-encoding.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
