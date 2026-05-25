import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Video, Download, Play, AlertTriangle, Settings } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { remuxMovToMp4 } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';

export default function MovToMp4() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [compress, setCompress] = useState(false);
  const [quality, setQuality] = useState(50);
  const [scale, setScale] = useState(100);

  useEffect(() => {
    // Clear storage on unmount to save space
    return () => {
      clearOPFSSandbox();
    };
  }, []);

  const handleFileSelect = async (filesList) => {
    const selected = filesList[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.mov')) {
      setError('Please upload a valid .MOV file.');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg('Buffering video to high-speed local disk storage...');
    setProgressPercent(0);
    setResultUrl('');

    try {
      await clearOPFSSandbox();
      await saveToOPFS('input_mov.mov', selected);
      setFile(selected);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to buffer video file. Please try a smaller file or a different browser.');
      setProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setProgressMsg(compress ? 'Initializing compression and transcoding engine...' : 'Initializing WebAssembly remux engine...');
    setProgressPercent(0);

    try {
      await remuxMovToMp4(
        'input_mov.mov',
        'output_mp4.mp4',
        { compress, quality, scale },
        ({ message, progress }) => {
          if (message) setProgressMsg(message);
          if (progress !== undefined) setProgressPercent(progress);
        }
      );

      const outFile = await getFromOPFS('output_mp4.mp4');
      const url = URL.createObjectURL(outFile);
      
      setResultUrl(url);
      setResultSize(outFile.size);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Processing failed. Please ensure your browser supports multi-threaded WebAssembly.');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setResultUrl('');
    setError('');
    setProcessing(false);
    setCompress(false);
    setQuality(50);
    setScale(100);
    clearOPFSSandbox();
  };

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Apple MOV to MP4 Converter Online — Free &amp; Offline | Fileora</title>
        <meta name="description" content="Convert Apple QuickTime MOV videos to universal MP4 files online for free. 100% offline, privacy-first conversion directly inside your browser." />
        <link rel="canonical" href="https://fileora.tech/mov-to-mp4" data-rh="true" />
        <meta property="og:title" content="Apple MOV to MP4 Converter Online — Free &amp; Offline | Fileora" />
        <meta property="og:description" content="Convert Apple QuickTime MOV videos to universal MP4 files online for free. 100% offline, privacy-first conversion directly inside your browser." />
        <meta property="og:url" content="https://fileora.tech/mov-to-mp4" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Apple MOV to MP4 Converter Online — Free &amp; Offline | Fileora" />
        <meta name="twitter:description" content="Convert Apple QuickTime MOV videos to universal MP4 files online for free. 100% offline, privacy-first conversion directly inside your browser." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>Apple MOV to MP4 Converter</h1>
          <p>Remux Apple QuickTime .MOV containers into universally playable .MP4 formats locally. Zero upload wait times, zero cloud storage risks—100% privacy-compliant browser processing.</p>
        </section>

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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Processing runs entirely client-side. Keep this tab active.</p>
              </div>
              {progressPercent > 0 && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Progress</span>
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
                  <ArrowLeft size={16} /> Convert Another Video
                </button>
                <div className="badge">
                  <Shield size={12} style={{ marginRight: '4px' }} /> Processed Offline
                </div>
              </div>

              {compress && resultSize > 0 && (
                <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div className="tool-description-para-last">Original Size: <span style={{ fontWeight: 600 }}>{formatBytes(file.size)}</span></div>
                  <div className="tool-description-para-last">Optimized Size: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{formatBytes(resultSize)}</span></div>
                  <div style={{ color: 'var(--success)', fontWeight: 600 }}>Saved: {((file.size - resultSize) / file.size * 100).toFixed(1)}%</div>
                </div>
              )}

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <video src={resultUrl} controls style={{ width: '100%', maxHeight: '400px', display: 'block' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name.replace(/\.[^/.]+$/, '')}.mp4</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)}</p>
                </div>
                <a href={resultUrl} download={`${file.name.replace(/\.[^/.]+$/, '')}.mp4`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                  <Download size={18} /> Download MP4 Video
                </a>
              </div>
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
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>MOV Container · {formatBytes(file.size)}</div>
                </div>
              </div>

              {/* Local Video Optimization & Compression Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={compress}
                    onChange={(e) => setCompress(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  Optimize and Compress Video (Reduce File Size)
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0 26px', lineHeight: '1.4' }}>
                  {compress 
                    ? "Applies local H.264 offline compression to significantly reduce your file size. (Takes slightly longer to process)." 
                    : "Direct copy/remux (Instant & Lossless). Takes less than a second, preserves 100% original quality, but output size will be similar to original."}
                </p>

                {compress && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.75rem', paddingLeft: '12px', borderLeft: '2px solid var(--accent-primary)' }}>
                    {/* Compression Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <span>Target Quality / Size</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={quality}
                        onChange={(e) => setQuality(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        <span>Smallest File</span>
                        <span>Balanced</span>
                        <span>High Quality</span>
                      </div>
                    </div>

                    {/* Scale Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                        <span>SD (Downscaled)</span>
                        <span>Balanced</span>
                        <span>Original Size</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleConvert} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                <Play size={16} /> Convert to MP4 Container
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept=".mov"
              maxSizeLabel=""
              helpText="Convert QuickTime MOV to universally playable MP4 locally."
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>High-Speed Apple MOV Container Remuxing</h2>
          <p className="tool-description-para">
            When converting video captured on iPhone, iPad, or macOS, you are typically converting an Apple QuickTime H.264 video track housed in a `.mov` container. Since standard web browsers and Windows devices cannot natively play `.mov` paths smoothly, Fileora remuxes the underlying streams directly into a `.mp4` packaging.
          </p>
          <p className="tool-description-para-last">
            Because the internal streams match in audio/video layouts, the WebAssembly engine performs a **direct stream copy** (no transcode re-encoding). This takes less than 1 second, retains 100% video resolution and visual quality, and writes the output directly back to your downloads sandbox.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
