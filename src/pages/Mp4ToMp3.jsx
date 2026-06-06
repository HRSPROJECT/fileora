import { useState, useEffect, useCallback } from 'react';
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff';
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel';
import ContinueWithBlob from '../components/shared/ContinueWithBlob';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Video, Download, Play, Music, AlertTriangle } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { extractAudioToMp3 } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';
import SecureShareButton from '../components/shared/SecureShareButton';

export default function Mp4ToMp3() {
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

  useEffect(() => {
    clearOPFSSandbox();
  }, []);

  const handleFileSelect = async (filesList) => {
    const selected = filesList[0];
    if (!selected) return;

    if (!selected.type.startsWith('video/') && !selected.name.toLowerCase().endsWith('.mov')) {
      setError('Please upload a valid video file.');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg('Buffering video to high-speed local disk storage...');
    setProgressPercent(0);
    setResultUrl('');

    try {
      await clearOPFSSandbox();
      await saveToOPFS('input_mp4.mp4', selected);
      setFile(selected);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to buffer video file. Please try a smaller file or a different browser.');
      setProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setProcessing(true);
    setProgressMsg('Initializing WebAssembly engine...');
    setProgressPercent(0);

    try {
      await extractAudioToMp3('input_mp4.mp4', 'output_audio.mp3', bitrate, ({ message, progress }) => {
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
      setError(err.message || 'Extraction failed. Please ensure your browser supports WebAssembly SharedArrayBuffers.');
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
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('mp4-to-mp3', {
    onFile: onHandoffFile,
  });

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Extract Audio from Video Online — MP4 to MP3 | Fileora</title>
        <meta name="description" content="Extract audio tracks from MP4, MOV, or WebM videos online for free. Convert video to high-fidelity MP3 locally and securely inside your browser." />
        <link rel="canonical" href="https://fileora.tech/mp4-to-mp3" data-rh="true" />
        <meta property="og:title" content="Extract Audio from Video Online — MP4 to MP3 | Fileora" />
        <meta property="og:description" content="Extract audio tracks from MP4, MOV, or WebM videos online for free. Convert video to high-fidelity MP3 locally and securely inside your browser." />
        <meta property="og:url" content="https://fileora.tech/mp4-to-mp3" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Extract Audio from Video Online — MP4 to MP3 | Fileora" />
        <meta name="twitter:description" content="Extract audio tracks from MP4, MOV, or WebM videos online for free. Convert video to high-fidelity MP3 locally and securely inside your browser." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>MP4 to MP3 Audio Extractor</h1>
          <p>Extract high-fidelity MP3 audio streams from video container formats locally in seconds. Fully offline conversion keeps your files private—choose target bitrate qualities up to 320kbps.</p>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Decoding video track and encoding high-fidelity MP3...</p>
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
                  <ArrowLeft size={16} /> Extract Another Audio Track
                </button>
                <div className="badge">
                  <Shield size={12} style={{ marginRight: '4px' }} /> Extracted Offline
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '2rem 1.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <Music size={48} color="var(--accent-primary)" />
                <audio src={resultUrl} controls style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name.replace(/\.[^/.]+$/, '')}.mp3</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)} · {bitrate}kbps MP3</p>
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
                  sourceToolId="mp4-to-mp3"
                  blob={resultBlob}
                  fileName={`${file.name.replace(/\.[^/.]+$/, '')}.mp3`}
                  mimeType="audio/mpeg"
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
                  <Music size={12} style={{ marginRight: '4px' }} /> Configured
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                <Video size={36} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Video File · {formatBytes(file.size)}</div>
                </div>
              </div>

              {/* Bitrate Select Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Audio Quality (Bitrate)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px' }}>
                  {[128, 192, 320].map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setBitrate(rate)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        backgroundColor: bitrate === rate ? 'var(--bg-secondary)' : 'transparent',
                        color: bitrate === rate ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {rate === 128 ? '128k (Eco)' : rate === 192 ? '192k (Standard)' : '320k (HQ)'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleExtract} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                <Play size={16} /> Extract MP3 Audio
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept="video/*"
              maxSizeLabel=""
              helpText="Extract high-fidelity MP3 audio tracks from video files locally."
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>High-Fidelity Client-Side Audio Extraction</h2>
          <p className="tool-description-para">
            Converting MP4 video clips into standalone MP3 audio formats is incredibly useful for extracting lecture recordings, podcast files, original movie soundtracks, or sound clips. However, cloud conversion platforms parse your files on remote systems, which compromises data sovereignty.
          </p>
          <p className="tool-description-para-last">
            Fileora demuxes the internal audio tracks and converts them to standard `libmp3lame` output files inside your local browser sandbox. This gives you high-speed, zero-upload processing at standard fidelity presets up to 320kbps. Keep your soundtrack local and completely private.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
