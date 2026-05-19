import React, { useState, useEffect } from 'react';
import { Download, Shield, Settings, FileImage, ArrowLeft, Trash2, CheckCircle2, Share } from 'lucide-react';
import JSZip from 'jszip';
import { compressImage, formatBytes } from '../utils/compressor';
import ImageComparisonSlider from './ImageComparisonSlider';

const Workspace = ({ files, setFiles, onReset }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  
  // Global Settings
  const [format, setFormat] = useState('WebP');
  const [quality, setQuality] = useState(80);
  const [scale, setScale] = useState(100);
  
  const [results, setResults] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!files || files.length === 0) return;

    let isMounted = true;
    
    const processQueue = async () => {
      setIsProcessing(true);
      setProgress(0);
      const q = quality / 100;
      
      const newResults = {};
      
      for (let i = 0; i < files.length; i++) {
        if (!isMounted) break;
        try {
          const res = await compressImage(files[i], format, q, scale);
          newResults[i] = res;
          setProgress(Math.round(((i + 1) / files.length) * 100));
        } catch (error) {
          console.error(`Failed to compress ${files[i].name}`, error);
        }
      }
      
      if (isMounted) {
        setResults(newResults);
        setIsProcessing(false);
      }
    };
    
    // Debounce processing to avoid thrashing on slider change
    const timeoutId = setTimeout(() => {
      processQueue();
    }, 600);

    return () => { 
      isMounted = false;
      clearTimeout(timeoutId); 
    };
  }, [files, format, quality, scale]);

  const handleDownloadAll = async () => {
    if (Object.keys(results).length === 0) return;
    
    Object.keys(results).forEach((index, i) => {
      const res = results[index];
      const file = files[index];
      if (res && res.blob) {
        // Slight delay for multiple files to prevent browser blocking
        setTimeout(() => {
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const ext = format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase();
          const url = URL.createObjectURL(res.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${nameWithoutExt}-optimized.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, i * 200);
      }
    });
  };

  const removeFile = (indexToRemove, e) => {
    e.stopPropagation();
    const newFiles = files.filter((_, i) => i !== indexToRemove);
    if (newFiles.length === 0) {
      onReset();
    } else {
      setFiles(newFiles);
      if (activeFileIndex === indexToRemove) {
        setActiveFileIndex(Math.max(0, indexToRemove - 1));
      } else if (activeFileIndex > indexToRemove) {
        setActiveFileIndex(activeFileIndex - 1);
      }
    }
  };

  const handleShareActiveFile = async () => {
    const res = results[activeFileIndex];
    const file = files[activeFileIndex];
    if (!res || !res.blob) return;

    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase();
    const filename = `${nameWithoutExt}-optimized.${ext}`;
    
    const shareFile = new File([res.blob], filename, { type: res.blob.type });

    if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({
          title: filename,
          files: [shareFile]
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        const clipboardItem = new window.ClipboardItem({
          [res.blob.type]: res.blob
        });
        await navigator.clipboard.write([clipboardItem]);
        alert("Image copied to clipboard!");
      } catch (err) {
        console.error('Clipboard copy failed', err);
        alert("Direct file sharing is not supported on this browser. Please download the image instead.");
      }
    }
  };

  const activeResult = results[activeFileIndex];

  const totals = React.useMemo(() => {
    let orig = 0;
    let opt = 0;
    let count = 0;
    Object.keys(results).forEach(key => {
      const res = results[key];
      if (res && res.optimizedSize) {
        orig += res.originalSize;
        opt += res.optimizedSize;
        count++;
      }
    });
    return {
      original: orig,
      optimized: opt,
      savings: orig ? ((orig - opt) / orig) * 100 : 0,
      count
    };
  }, [results]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onReset} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Optimization Workspace</h2>
        </div>
        <div className="badge">
          <Shield size={14} style={{ marginRight: '0.25rem' }} /> Local Batch Processing
        </div>
      </div>

      <div className="workspace-grid">
        
        {/* Left Column: Canvas + Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Canvas Area */}
          <div className="card" style={{ height: '500px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            {isProcessing && !activeResult ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ marginBottom: '1rem' }}>Processing batch queue ({progress}%)...</div>
                <div style={{ width: '60%', height: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent-primary)', transition: 'width 0.2s' }}></div>
                </div>
              </div>
            ) : activeResult ? (
              <ImageComparisonSlider 
                originalUrl={activeResult.originalUrl} 
                optimizedUrl={activeResult.optimizedUrl} 
                originalSize={activeResult.originalSize}
                optimizedSize={activeResult.optimizedSize}
                key={activeFileIndex} // force re-render when switching images to reset slider
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                Processing image...
              </div>
            )}
          </div>

          {/* Batch Queue List */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Batch Queue ({files.length} items)
              </label>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Select an item to preview
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {files.map((file, index) => {
                const res = results[index];
                const isActive = activeFileIndex === index;
                return (
                  <div 
                    key={index}
                    onClick={() => setActiveFileIndex(index)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.75rem', 
                      backgroundColor: isActive ? 'var(--bg-tertiary)' : 'var(--bg-primary)', 
                      borderRadius: 'var(--radius-md)', 
                      border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FileImage size={20} color={isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                        {file.name}
                      </div>
                      {res ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {formatBytes(res.originalSize)} → <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{formatBytes(res.optimizedSize)}</span>
                          </span>
                          <span style={{ color: res.savings >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                            {res.savings >= 0 ? '-' : '+'}{Math.abs(res.savings).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>In queue...</div>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => removeFile(index, e)}
                      style={{ padding: '0.5rem', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title="Remove from queue"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '100px' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Settings size={18} /> Global Batch Settings
            </div>
            
            {totals.count > 0 && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Total Size</span>
                  <span>{formatBytes(totals.original)} → <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{formatBytes(totals.optimized)}</span></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Total Savings</span>
                  <span style={{ color: totals.savings >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                    {totals.savings >= 0 ? '-' : '+'}{Math.abs(totals.savings).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              These settings will be applied to all {files.length} files in your batch queue instantly.
            </p>
            
            {/* Format Toggle */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Output Format
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
                {['WebP', 'JPEG', 'PNG'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      backgroundColor: format === fmt ? 'var(--bg-secondary)' : 'transparent',
                      color: format === fmt ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: format === fmt ? 'var(--shadow-sm)' : 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale / Resize Slider */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Image Scale (Resize)
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{scale}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={scale} 
                onChange={(e) => setScale(parseInt(e.target.value))}
                className="slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                <span>10%</span>
                <span>Original</span>
              </div>
            </div>

            {/* Quality Slider */}
            {format !== 'PNG' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Compression Quality
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{quality}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={quality} 
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  <span>Smallest File</span>
                  <span>Highest Quality</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '1rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)' }}
              onClick={handleDownloadAll}
              disabled={Object.keys(results).length === 0 || isProcessing}
            >
              {isProcessing ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Download size={20} /> {files.length > 1 ? 'Download All' : 'Download Image'}
                </>
              )}
            </button>
            
            <button 
              className="btn btn-secondary" 
              style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
              onClick={handleShareActiveFile}
              disabled={!activeResult || isProcessing}
              title="Share active image"
            >
              <Share size={20} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Workspace;
