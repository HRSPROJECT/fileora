import { useState, useEffect, useCallback } from 'react';
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff';
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel';
import ContinueWithBlob from '../components/shared/ContinueWithBlob';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Shield, Video, Download, Play, Plus, ArrowUp, ArrowDown, Trash2, AlertTriangle, Layers } from 'lucide-react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import DropZone from '../components/shared/DropZone';
import { saveToOPFS, getFromOPFS, clearOPFSSandbox } from '../utils/opfsHelper';
import { mergeVideos } from '../utils/videoEngine';
import { formatBytes } from '../utils/imageUtils';
import SecureShareButton from '../components/shared/SecureShareButton';

export default function MergeVideo() {
  const [clips, setClips] = useState([]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);

  useEffect(() => {
    clearOPFSSandbox();
  }, []);

  const handleFileSelect = async (filesList) => {
    const validFiles = filesList.filter(file => file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov'));
    
    if (validFiles.length === 0) {
      setError('Please upload valid video files.');
      return;
    }

    setError('');
    const newClips = [...clips, ...validFiles];
    setClips(newClips);
    setResultUrl('');
  };

  const removeClip = (index) => {
    const newClips = clips.filter((_, i) => i !== index);
    setClips(newClips);
  };

  const moveClip = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === clips.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newClips = [...clips];
    const temp = newClips[index];
    newClips[index] = newClips[newIndex];
    newClips[newIndex] = temp;
    setClips(newClips);
  };

  const handleMerge = async () => {
    if (clips.length < 2) {
      setError('Please add at least 2 video clips to merge.');
      return;
    }

    setError('');
    setProcessing(true);
    setProgressMsg('Buffering video clips to local storage sandbox...');
    setProgressPercent(0);

    try {
      await clearOPFSSandbox();
      
      // Save all clips to OPFS
      const opfsNames = [];
      for (let i = 0; i < clips.length; i++) {
        const opfsName = `clip_${i}.mp4`;
        await saveToOPFS(opfsName, clips[i]);
        opfsNames.push(opfsName);
      }

      setProgressMsg('Initializing WebAssembly engine...');
      await mergeVideos(opfsNames, 'merged_video.mp4', ({ message, progress }) => {
        if (message) setProgressMsg(message);
        if (progress !== undefined) setProgressPercent(progress);
      });

      const outFile = await getFromOPFS('merged_video.mp4');
      const url = URL.createObjectURL(outFile);

      setResultBlob(outFile);
      setResultUrl(url);
      setResultSize(outFile.size);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Merging process failed. Ensure that the files are valid video containers.');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setClips([]);
    setResultUrl('');
    setResultBlob(null);
    setError('');
    setProcessing(false);
    clearOPFSSandbox();
  };

  const onHandoffFile = useCallback((nextFile) => {
    handleFileSelect([nextFile]);
  }, []);
  const onHandoffFiles = useCallback((files) => {
    handleFileSelect(files);
  }, []);
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('merge-video', {
    onFile: onHandoffFile,
    onFiles: onHandoffFiles,
  });

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Merge Videos Online — Combine Video Clips | Fileora</title>
        <meta name="description" content="Combine and stitch multiple videos together online for free. In-browser client-side video merger—join MP4, MOV, or WebM clips locally and securely." />
        <link rel="canonical" href="https://fileora.tech/merge-video" data-rh="true" />
        <meta property="og:title" content="Merge Videos Online — Combine Video Clips | Fileora" />
        <meta property="og:description" content="Combine and stitch multiple videos together online for free. In-browser client-side video merger—join MP4, MOV, or WebM clips locally and securely." />
        <meta property="og:url" content="https://fileora.tech/merge-video" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Merge Videos Online — Combine Video Clips | Fileora" />
        <meta name="twitter:description" content="Combine and stitch multiple videos together online for free. In-browser client-side video merger—join MP4, MOV, or WebM clips locally and securely." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <span className="eyebrow">Video Utilities</span>
          <h1>Video Merger &amp; Joiner</h1>
          <p>Stitch and concatenate multiple video clips together locally inside your browser. Drag and sort files dynamically—100% offline security means no bandwidth consumption or cloud logging.</p>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Combining video tracks and stitching streams offline... do not close this tab.</p>
              </div>
              {progressPercent > 0 && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Merging</span>
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
                  <ArrowLeft size={16} /> Merge New Set of Videos
                </button>
                <div className="badge">
                  <Shield size={12} style={{ marginRight: '4px' }} /> Stitched Locally
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <video src={resultUrl} controls style={{ width: '100%', maxHeight: '400px', display: 'block' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>combined-video.mp4</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(resultSize)} · Combined Clips: {clips.length}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={resultUrl} download="combined-video.mp4" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <Download size={18} /> Download Combined Video
                  </a>
                  {resultBlob && (
                    <SecureShareButton 
                      file={resultBlob} 
                      fileName="combined-video.mp4" 
                      style={{ padding: '10px 20px' }}
                    />
                  )}
                </div>
              </div>

              {resultBlob && (
                <ContinueWithBlob
                  sourceToolId="merge-video"
                  blob={resultBlob}
                  fileName="combined-video.mp4"
                  mimeType="video/mp4"
                restoreFiles={clips}
                  disabled={processing}
                />
              )}
            </div>
          ) : clips.length > 0 ? (
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={18} color="var(--accent-primary)" /> Clips in Queue ({clips.length})
                </div>
                <button onClick={handleReset} className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }}>Clear All</button>
              </div>

              {/* Clips Queue list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {clips.map((clip, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'var(--bg-secondary)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <Video size={20} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatBytes(clip.size)}</div>
                    </div>

                    {/* Sorting actions */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => moveClip(index, 'up')}
                        disabled={index === 0}
                        style={{ padding: '4px', border: 'none', background: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveClip(index, 'down')}
                        disabled={index === clips.length - 1}
                        style={{ padding: '4px', border: 'none', background: 'none', cursor: index === clips.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeClip(index)}
                        style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add more files dropzone or file input */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label className="btn btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                  <Plus size={16} /> Add Video Clip
                  <input
                    type="file"
                    multiple
                    accept="video/*,.mov"
                    onChange={(e) => handleFileSelect(Array.from(e.target.files))}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  onClick={handleMerge}
                  disabled={clips.length < 2}
                  className="btn btn-primary"
                  style={{ flex: 1.5, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Play size={16} /> Stitch {clips.length} Clips
                </button>
              </div>
            </div>
          ) : (
            <DropZone
              onFiles={handleFileSelect}
              accept="video/*"
              maxSizeLabel=""
              helpText="Stitch and merge multiple video files into a single stream."
              multiple
            />
          )}
        </section>

        <section className="container tool-description-section">
          <h2>High-Speed Local Video Concatenation</h2>
          <p className="tool-description-para">
            Merging raw recordings into cohesive presentation materials is typically a heavy compute process. Sending multiple gigs of clip files across standard cloud converters consumes immense bandwidth, takes substantial upload/download time, and leaks document metadata.
          </p>
          <p className="tool-description-para-last">
            Fileora solves this with a **lossless background concat demuxer**. If the audio-video layouts, frame dimensions, and frame rates of the loaded files align, the engine slices and bonds the packets in a fraction of a second without re-encoding! Re-encoding filter chains run only as a fallback to guarantee a successful merge for mismatched files.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
