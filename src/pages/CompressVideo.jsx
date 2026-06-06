import { useState, useEffect, useCallback } from 'react';
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff';
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel';
import ContinueWithBlob from '../components/shared/ContinueWithBlob';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Video, Download, Play, Settings, AlertTriangle } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { compressVideo } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';
import SecureShareButton from '../components/shared/SecureShareButton';

export default function CompressVideo() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);


  // Settings
  const [quality, setQuality] = useState(60);
  const [scale, setScale] = useState(100);

  useEffect(() => {
    clearOPFSSandbox();
  }, []);

  const handleFileSelect = async (filesList) => {
    const selected = filesList[0];
    if (!selected) return;

    if (!selected.type.startsWith('video/') && !selected.name.toLowerCase().endsWith('.mov')) {
      setError('Please upload a valid video file (MP4, MOV, WebM, etc.).');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg('Buffering video to high-speed local disk storage...');
    setProgressPercent(0);
    setResultUrl('');

    try {
      await clearOPFSSandbox();
      await saveToOPFS('input_compress.mp4', selected);
      setFile(selected);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to buffer video file. Please try a smaller file or a different browser.');
      setProcessing(false);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setProgressMsg('Initializing WebAssembly engine...');
    setProgressPercent(0);

    try {
      await compressVideo(
        'input_compress.mp4',
        'output_compressed.mp4',
        { quality, scale },
        ({ message, progress }) => {
          if (message) setProgressMsg(message);
          if (progress !== undefined) setProgressPercent(progress);
        }
      );

      const outFile = await getFromOPFS('output_compressed.mp4');
      const url = URL.createObjectURL(outFile);
      
      setResultBlob(outFile);
      setResultUrl(url);
      setResultSize(outFile.size);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Processing failed. Please ensure your browser supports SharedArrayBuffers.');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setResultUrl('');
    setResultBlob(null);
    setError('');
    setProcessing(false);
    clearOPFSSandbox();
  };

  const onHandoffFile = useCallback((nextFile) => {
    handleFileSelect([nextFile]);
  }, []);
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('compress-video', {
    onFile: onHandoffFile,
  });

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Compress Video Online — Shrink Video File Size | Fileora</title>
        <meta name="description" content="Reduce video file sizes online for free. In-browser client-side video compressor—shrink MP4, MOV, WebM files locally with zero limits and 100% privacy." />
        <link rel="canonical" href="https://fileora.tech/compress-video" data-rh="true" />
        <meta property="og:title" content="Compress Video Online — Shrink Video File Size | Fileora" />
        <meta property="og:description" content="Reduce video file sizes online for free. In-browser client-side video compressor—shrink MP4, MOV, WebM files locally with zero limits and 100% privacy." />
        <meta property="og:url" content="https://fileora.tech/compress-video" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Compress Video Online — Shrink Video File Size | Fileora" />
        <meta name="twitter:description" content="Reduce video file sizes online for free. In-browser client-side video compressor—shrink MP4, MOV, WebM files locally with zero limits and 100% privacy." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>Video Compressor</h1>
          <p>Shrink video weights down to 90% in your browser. Choose customized scale proportions and target bitrates offline—ideal for WhatsApp attachments, email targets, or disk saves.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        <section className="container" style={{ maxWidth: '800px', margin: '0 auto 4rem auto' }}>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compressing video frames client-side... this may take some time depending on video length.</p>
              </div>
              {progressPercent > 0 && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Compressing</span>
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
                  <ArrowLeft size={16} /> Compress Another Video
                </button>
                <div className="badge">
                  <Shield size={12} style={{ marginRight: '4px' }} /> Compressed Locally
                </div>
              </div>

              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="tool-description-para-last">Original: <span style={{ fontWeight: 600 }}>{formatBytes(file.size)}</span></div>
                <div className="tool-description-para-last">Compressed: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{formatBytes(resultSize)}</span></div>
                <div style={{ color: 'var(--success)', fontWeight: 600 }}>Saved: {((file.size - resultSize) / file.size * 100).toFixed(1)}%</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <video src={resultUrl} controls style={{ width: '100%', maxHeight: '400px', display: 'block' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name.replace(/\.[^/.]+$/, '')}-optimized.mp4</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href={resultUrl} download={`${file.name.replace(/\.[^/.]+$/, '')}-optimized.mp4`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', textDecoration: 'none' }}>
                    <Download size={18} /> Download Compressed Video
                  </a>
                  {resultBlob && (
                    <SecureShareButton 
                      file={resultBlob} 
                      fileName={`${file.name.replace(/\.[^/.]+$/, '')}-optimized.mp4`} 
                    />
                  )}
                </div>
              </div>

              {resultBlob && (
                <ContinueWithBlob
                  sourceToolId="compress-video"
                  blob={resultBlob}
                  fileName={`${file.name.replace(/\.[^/.]+$/, '')}-optimized.mp4`}
                  mimeType="video/mp4"
                    restoreFile={file}
                  disabled={processing}
                />
              )}
            </div>
          ) : file ? (
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
                  <ArrowLeft size={16} /> Choose Different Video
                </button>
                <div className="badge">
                  <Settings size={12} style={{ marginRight: '4px' }} /> Configure
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <Video size={36} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatBytes(file.size)}</div>
                </div>
              </div>

              {/* Compression Quality Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>Compression Quality</span>
                  <span style={{ color: 'var(--accent-primary)' }}>{quality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  <span>Smallest File (Low Quality)</span>
                  <span>Balanced</span>
                  <span>Highest Quality</span>
                </div>
              </div>

              {/* Scale Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span>Resolution Scale</span>
                  <span style={{ color: 'var(--accent-primary)' }}>{scale}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="10"
                  value={scale}
                  onChange={(e) => setScale(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  <span>Small Screen (SD)</span>
                  <span>Balanced</span>
                  <span>Original Dimensions</span>
                </div>
              </div>

              {/* Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setQuality(35);
                    setScale(70);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px', padding: '6px 12px' }}
                >
                  WhatsApp Compact
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuality(60);
                    setScale(100);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px', padding: '6px 12px' }}
                >
                  HD Standard
                </button>
              </div>

              <button onClick={handleCompress} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                <Play size={16} /> Compress Video Locally
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept="video/*"
              maxSizeLabel=""
              helpText="Compress and shrink MP4, MOV, or WebM videos locally."
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>Smart Client-Side Video Size Shrinking</h2>
          <p className="tool-description-para">
            Traditional video compress utilities upload your huge clips across network servers where they are queued, processed, and potentially logged. This poses extreme privacy threats, especially for custom private or corporate legal recordings. Fileora performs high-fidelity H.264 compression entirely inside your local sandbox.
          </p>
          <p className="tool-description-para-last">
            By adjusting the quality bitrates (CRF limits) and downscaling standard multi-thousand resolution dimensions (e.g. converting heavy 4K/1080p outputs into mobile-friendly 720p layouts), Fileora shrinks clip weights up to 90% locally in seconds. Perfect for email attachments, mobile messaging caps, and archiving.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
