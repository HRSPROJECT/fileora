import React from 'react';
import { UploadCloud, Zap, Shield, Cpu } from 'lucide-react';

const LandingPage = ({ onFileSelect }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginTop: '6rem', marginBottom: '4rem' }}>
        <h1 className="hero-title text-gradient">
          <span>Compress images</span>
          <span>without losing the soul.</span>
        </h1>
        <p className="hero-subtitle">
          Professional-grade optimization in seconds. Privacy-first, browser-based, and completely free.
        </p>
      </div>

      {/* Upload Box */}
      <div 
        className="card delay-100"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '4rem 2rem',
          textAlign: 'center',
          borderStyle: 'dashed',
          borderWidth: '2px',
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ pointerEvents: 'none' }}>
          <UploadCloud size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Drag & Drop your images here</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>or click to browse. Supports JPEG, PNG, WebP, and AVIF up to 50MB.</p>
        </div>
        
        <input 
          type="file" 
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileSelect(e.target.files);
            }
          }}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%', height: '100%'
          }}
        />
        
        <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>Select Images</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={16} /> PROCESSED LOCALLY IN YOUR BROWSER. NO FILES UPLOADED.
      </div>

      {/* Features Section / Carousel */}
      <div id="features" style={{ marginTop: '8rem', paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Mastering Image Compression</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Everything you need to know about getting the perfect balance between file size and visual fidelity.</p>
        </div>

        <div style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: '2rem', 
          padding: '1rem', 
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE/Edge */
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Card 1 */}
          <div className="card" style={{ minWidth: '320px', maxWidth: '350px', flex: '0 0 auto', padding: '2rem', scrollSnapAlign: 'start' }}>
            <Zap size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Lightning Fast</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              By processing assets locally in your browser using WebAssembly and native Canvas APIs, we eliminate upload times and guarantee instantaneous results regardless of file size.
            </p>
          </div>
          
          {/* Card 2 */}
          <div className="card" style={{ minWidth: '320px', maxWidth: '350px', flex: '0 0 auto', padding: '2rem', scrollSnapAlign: 'start' }}>
            <Cpu size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Lossless Quality</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              High-precision engineering meets human-centric minimalism. Our intelligent optimization preserves the visual soul of your images while aggressively stripping unnecessary data bloat.
            </p>
          </div>
          
          {/* Card 3 */}
          <div className="card" style={{ minWidth: '320px', maxWidth: '350px', flex: '0 0 auto', padding: '2rem', scrollSnapAlign: 'start' }}>
            <Shield size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Privacy Guaranteed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Traditional tools upload your files to a server, process them, and send them back. Fileora processes everything locally in your device's memory. Zero data leaves your browser.
            </p>
          </div>
          
          {/* Card 4 - Batch Processing */}
          <div className="card" style={{ minWidth: '320px', maxWidth: '350px', flex: '0 0 auto', padding: '2rem', scrollSnapAlign: 'start' }}>
            <UploadCloud size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Batch Processing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Drop an entire folder of images at once. Fileora processes multiple files in parallel and lets you download them all in a single structured ZIP archive instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
