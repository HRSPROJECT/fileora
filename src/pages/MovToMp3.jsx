import { useState, useCallback } from 'react';
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff';
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel';
import ContinueWithBlob from '../components/shared/ContinueWithBlob';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Music, Download, Play, AlertTriangle, Settings } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { extractAudioToMp3 } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';
import SecureShareButton from '../components/shared/SecureShareButton';

export default function MovToMp3() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);

  // Settings
  const [bitrate, setBitrate] = useState(192);

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
      await saveToOPFS('input_mov_audio.mov', selected);
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
    setProgressMsg('Initializing audio extraction engine...');
    setProgressPercent(0);

    try {
      await extractAudioToMp3('input_mov_audio.mov', 'output_audio.mp3', bitrate, ({ message, progress }) => {
        if (message) setProgressMsg(message);
        if (progress !== undefined) setProgressPercent(progress);
      });

      const outFile = await getFromOPFS('output_audio.mp3');
      const url = URL.createObjectURL(outFile);
      
      setResultBlob(outFile);
      setResultUrl(url);
      setResultSize(outFile.size);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Audio extraction failed. Please ensure SharedArrayBuffers are active.');
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
    setBitrate(192);
    clearOPFSSandbox();
  };

  const onHandoffFile = useCallback((nextFile) => {
    handleFileSelect([nextFile]);
  }, []);
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('mov-to-mp3', {
    onFile: onHandoffFile,
  });

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Extract MOV to MP3 Online — Free &amp; Offline | Fileora</title>
        <meta name="description" content="Extract audio tracks from Apple QuickTime MOV videos to universal high-quality MP3 format. 100% offline, private client-side audio extraction in your browser." />
        <link rel="canonical" href="https://fileora.tech/mov-to-mp3" data-rh="true" />
        <meta property="og:title" content="Extract MOV to MP3 Online — Free &amp; Offline | Fileora" />
        <meta property="og:description" content="Extract audio tracks from Apple QuickTime MOV videos to universal high-quality MP3 format. 100% offline, private client-side audio extraction in your browser." />
        <meta property="og:url" content="https://fileora.tech/mov-to-mp3" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Extract MOV to MP3 Online — Free &amp; Offline | Fileora" />
        <meta name="twitter:description" content="Extract audio tracks from Apple QuickTime MOV videos to universal high-quality MP3 format. 100% offline, private client-side audio extraction in your browser." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>Extract MOV to MP3</h1>
          <p>Extract high-fidelity audio streams directly from Apple QuickTime .MOV captures and export as standard .MP3 files locally. Completely private, fast, and offline.</p>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extracting audio track client-side... keep this tab active.</p>
              </div>
              {progressPercent > 0 && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Extracting</span>
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
                  <ArrowLeft size={16} /> Extract Another Audio
                </button>
                <div className="badge">
                  <Shield size={12} style={{ marginRight: '4px' }} /> Processed Offline
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Music size={48} color="var(--accent-primary)" />
                <audio src={resultUrl} controls style={{ width: '100%', maxWidth: '400px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name.replace(/\.[^/.]+$/, '')}.mp3</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)} · Format: MP3 ({bitrate}kbps)</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={resultUrl} download={`${file.name.replace(/\.[^/.]+$/, '')}.mp3`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <Download size={18} /> Download MP3 Audio
                  </a>
                  {resultBlob && (
                    <SecureShareButton 
                      file={resultBlob} 
                      fileName={`${file.name.replace(/\.[^/.]+$/, '')}.mp3`} 
                      style={{ padding: '10px 20px' }}
                    />
                  )}
                </div>
              </div>

              {resultBlob && (
                <ContinueWithBlob
                  sourceToolId="mov-to-mp3"
                  blob={resultBlob}
                  fileName={`${file.name.replace(/\.[^/.]+$/, '')}.mp3`}
                  mimeType="audio/mpeg"
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
                  <Settings size={12} style={{ marginRight: '4px' }} /> Configuration
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <Music size={36} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>MOV Container · {formatBytes(file.size)}</div>
                </div>
              </div>

              {/* Bitrate Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Audio Output Bitrate</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {[128, 192, 320].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setBitrate(rate)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: bitrate === rate ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: bitrate === rate ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '13px'
                      }}
                    >
                      {rate} kbps {rate === 192 && '(Balanced)'} {rate === 320 && '(HQ)'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleConvert} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                <Play size={16} /> Extract MP3 Audio
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept=".mov"
              maxSizeLabel=""
              helpText="Select Apple MOV video file to extract audio locally."
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>Confidential Client-Side Audio Extraction</h2>
          <p className="tool-description-para">
            Uploading private video logs or iPhone captures across external networks to convert them to audio presents substantial security concerns. Fileora parses and extracts the binary layers of your Apple QuickTime H.264 streams directly within your local browser sandbox.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Using advanced local WebAssembly compiling systems, the audio channels are separated and re-encoded using `libmp3lame` natively on your machine's CPU. 100% private, instant, and completely safe.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '32px 0' }} />

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Step-by-Step Guide to Convert MOV to MP3</h3>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li><strong>Select or Drop Video:</strong> Click on the drag-and-drop workspace above to select your target Apple MOV container file. Fileora secures the file instantly into the local sandboxed filesystem (OPFS) without transmitting a single byte over the internet.</li>
            <li><strong>Choose Audio Quality Preset:</strong> Select the output audio bitrate according to your requirements. We support 128 kbps (lightweight), 192 kbps (balanced standard), and 320 kbps (lossless high fidelity audio).</li>
            <li><strong>Extract & Download:</strong> Click the "Extract MP3 Audio" button. The browser will configure the processing worker in the background, decode the QuickTime audio channels, and package them into an MP3 file within seconds. Once ready, download it directly to your folder.</li>
          </ol>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Understanding Audio Bitrates (kbps)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>128 kbps — Standard</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ideal for audiobooks, vocal podcasts, or lecture recordings. Keeps file weights minimal while maintaining clear and readable dialogue channels.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>192 kbps — Balanced</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Perfect for standard video streams, generic music captures, and social media exports. Excellent balance of compressed file size and sound clarity.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>320 kbps — High Fidelity</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Optimized for musical instruments, live concerts, or professional acoustic records. Ensures zero compressed artifacts and preserves the original dynamic range.</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Frequently Asked Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Is my video file uploaded to any servers?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No, absolutely not. Unlike standard cloud-based converters, Fileora operates with 100% offline local technology. Your private videos remain in your physical browser memory space and are never transmitted over the internet.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>How does the in-browser converter process large files?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>We utilize a highly secure local sandboxed database called Origin Private File System (OPFS). This writes the uploaded video stream directly onto your physical hard drive (SSD/HDD) instead of storing the data in the browser RAM, entirely preventing crashes and lag on massive files.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Why is Fileora a better alternative to standard cloud video utilities?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cloud platforms like Zamzar or CloudConvert collect metadata, enforce queue limits, and store uploaded files on remote nodes. Fileora is free of limits, processes conversions instantly since there are no uploads, and secures your sensitive data in compliance with strict privacy standards.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
