import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff';
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel';
import ContinueWithBlob from '../components/shared/ContinueWithBlob';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Video, Download, Play, Repeat, AlertTriangle, Settings } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { repeatVideo } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';
import SecureShareButton from '../components/shared/SecureShareButton';

export default function RepeatVideo() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);

  // Settings
  const [repeats, setRepeats] = useState(3);
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
      await saveToOPFS('input_repeat.mp4', selected);
      
      const localUrl = URL.createObjectURL(selected);
      if (tempUrl) URL.revokeObjectURL(tempUrl);
      setTempUrl(localUrl);
      setFile(selected);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to buffer video file. Please try a smaller file.');
      setProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    if (repeats < 2 || repeats > 20) {
      setError('Repetitions count must be between 2 and 20.');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg(`Initializing repeater engine for ${repeats}x loop...`);
    setProgressPercent(0);

    try {
      await repeatVideo('input_repeat.mp4', 'output_repeated.mp4', repeats, ({ message, progress }) => {
        if (message) setProgressMsg(message);
        if (progress !== undefined) setProgressPercent(progress);
      });

      const outFile = await getFromOPFS('output_repeated.mp4');
      const url = URL.createObjectURL(outFile);
      
      setResultBlob(outFile);
      setResultUrl(url);
      setResultSize(outFile.size);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Looper failed. Please make sure SharedArrayBuffers are enabled.');
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
    setRepeats(3);
    clearOPFSSandbox();
  };

  const onHandoffFile = useCallback((nextFile) => {
    handleFileSelect([nextFile]);
  }, []);
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('repeat-video', {
    onFile: onHandoffFile,
  });

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Loop &amp; Repeat Video Online — Free &amp; Offline | Fileora</title>
        <meta name="description" content="Repeat and loop video files online for free. Combine multiple loops of the same video into a single MP4 locally inside your browser with 100% privacy." />
        <link rel="canonical" href="https://fileora.tech/repeat-video" data-rh="true" />
        <meta property="og:title" content="Loop &amp; Repeat Video Online — Free &amp; Offline | Fileora" />
        <meta property="og:description" content="Repeat and loop video files online for free. Combine multiple loops of the same video into a single MP4 locally inside your browser with 100% privacy." />
        <meta property="og:url" content="https://fileora.tech/repeat-video" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Loop &amp; Repeat Video Online — Free &amp; Offline | Fileora" />
        <meta name="twitter:description" content="Repeat and loop video files online for free. Combine multiple loops of the same video into a single MP4 locally inside your browser with 100% privacy." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>Video Looper &amp; Repeater</h1>
          <p>Repeat a video multiple times and combine them into a single, seamless looped output locally in your browser. Lightning-fast remuxing with zero quality loss.</p>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stitching video repetitions client-side... keep this tab active.</p>
              </div>
              {progressPercent > 0 && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Stitching</span>
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
                  <ArrowLeft size={16} /> Loop Another Video
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name.replace(/\.[^/.]+$/, '')}-repeated.mp4</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)} · Loops: {repeats}x</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={resultUrl} download={`${file.name.replace(/\.[^/.]+$/, '')}-repeated.mp4`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <Download size={18} /> Download Looped Video
                  </a>
                  {resultBlob && (
                    <SecureShareButton 
                      file={resultBlob} 
                      fileName={`${file.name.replace(/\.[^/.]+$/, '')}-repeated.mp4`} 
                      style={{ padding: '10px 20px' }}
                    />
                  )}
                </div>
              </div>

              {resultBlob && (
                <ContinueWithBlob
                  sourceToolId="repeat-video"
                  blob={resultBlob}
                  fileName={`${file.name.replace(/\.[^/.]+$/, '')}-repeated.mp4`}
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

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <video ref={videoRef} src={tempUrl} controls style={{ width: '100%', maxHeight: '300px', display: 'block' }} />
              </div>

              {/* Loop Repetitions configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Repeat size={14} color="var(--accent-primary)" /> Loop Repetitions</span>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '15px', fontWeight: 'bold' }}>{repeats} times</span>
                </div>
                
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="1"
                  value={repeats}
                  onChange={(e) => setRepeats(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginTop: '8px' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  <span>2 loops</span>
                  <span>5 loops</span>
                  <span>10 loops</span>
                  <span>15 loops</span>
                </div>
              </div>

              <button onClick={handleConvert} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                <Repeat size={16} /> Create Looped Video
              </button>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept="video/*"
              maxSizeLabel=""
              helpText="Select video file to repeat and loop locally."
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>Zero Quality Loss Video Stitching &amp; Repeating</h2>
          <p className="tool-description-para">
            Traditional repeat tools force you to transcode and re-compress frames, which causes extreme rendering latency and degrades pixel definition. Fileora handles this using a lightning-fast WebAssembly-based **concat demuxer**.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Since the video format, dimensions, bitrates, and keyframe intervals are exactly identical, we copy the original streams directly and repeat the reference blocks. This takes less than a second for up to 15 loops, uses zero remote servers, and preserves 100% of your visual quality.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '32px 0' }} />

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>How to Repeat and Loop Videos Offline</h3>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li><strong>Import Selected Clip:</strong> Drag and drop your MP4, MOV, or WebM video file into the upload zone above. The video is securely held in the browser's high-speed local filesystem sandbox (OPFS) and is never transmitted to any external networks.</li>
            <li><strong>Select Repeats Target:</strong> Use the stylized slider to specify how many times you want the video clip to loop (from 2 up to 15 repetitions). The interface will calculate the output segment structures dynamically.</li>
            <li><strong>Compile & Save:</strong> Click the "Create Looped Video" button. Our client-side WebAssembly demuxer concatenates the streams losslessly within seconds. Once finished, preview the looped video directly and download the high-resolution output file.</li>
          </ol>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Common Use Cases for Looping Videos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>Social Media Loops</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Perfect for Instagram Reels, TikTok clips, or YouTube Shorts. Repeat standard short sequences or animated clips to capture viewer attention indefinitely.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>Kiosk & Digital Signage</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ideal for offline display boards, storefront screens, or restaurant menus. Repeat promotional clips or catalogs continuously without manual intervention.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>Music Beats & Soundscapes</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Great for repeating visualizers, ambient soundtracks, or study beats tracks. Stitch together short visual hooks into hour-long continuous files.</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Frequently Asked Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Does looping a video reduce its resolution or quality?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No. Standard looping tools transcode and re-compress video blocks, which degrades color clarity and sharpness. Fileora uses direct stream copy concat. Because we only copy the native bitstream, there is absolute zero quality loss.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>What file size and video formats are supported?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>We support all standard formats including MP4, Apple MOV, WebM, and MKV. Since the processing runs 100% locally in your browser memory via the Origin Private File System, there are no file size limits, allowing you to compile huge files smoothly.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Is Fileora free of queue wait times and usage limits?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Yes. Since processing executes entirely client-side on your own device, we do not pay for heavy cloud server rendering. We pass these savings directly to you, making all video utilities completely unlimited and free forever.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
