import React, { useEffect } from 'react';
import { UploadCloud, Zap, Shield, Cpu, Image, ChevronDown } from 'lucide-react';

const faqData = [
  {
    q: "Is Fileora really free to use?",
    a: "Yes, 100% free with no hidden limits. There are no file size caps, no daily quotas, and no watermarks. Fileora is open source and funded by the community."
  },
  {
    q: "Do my images get uploaded to a server?",
    a: "Never. Fileora processes every image entirely inside your browser using local JavaScript and Canvas APIs. Your files never leave your device, making it the most private image compressor available."
  },
  {
    q: "What image formats does Fileora support?",
    a: "Fileora supports JPEG, PNG, WebP, and AVIF. You can also convert between formats during compression — for example, compress a PNG and export it as a smaller WebP file."
  },
  {
    q: "How much can Fileora reduce my file size?",
    a: "Results vary by image, but most photos see a 60–85% reduction in file size with no visible quality loss. Graphics and screenshots with flat colors can see even higher compression ratios."
  },
  {
    q: "Can I compress multiple images at once?",
    a: "Absolutely. Fileora supports full batch processing — drag an entire folder of images and compress them all simultaneously with the same quality settings. Download each file individually when done."
  }
];

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

  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(item => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginTop: '6rem', marginBottom: '2rem' }}>
        <h1 className="hero-title text-gradient">
          <span>Compress images</span>
          <span>without losing the soul.</span>
        </h1>
        <p className="hero-subtitle">
          Professional-grade optimization in seconds. Privacy-first, browser-based, and completely free.
        </p>
      </div>

      {/* SEO Keyword H2 */}
      <h2 style={{
        textAlign: 'center',
        fontSize: '1.125rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: '3rem',
        opacity: 0.85
      }}>
        The fastest free image compressor online
      </h2>

      {/* Upload Box */}
      <div 
        className="card delay-100 upload-box"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
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

      {/* Trust Bar */}
      <div className="trust-bar" style={{
        textAlign: 'center',
        marginTop: '1.5rem',
        color: 'var(--text-tertiary)',
        fontSize: '0.875rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Shield size={14} /> Files never leave your device
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>No signup</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>No file size tracking</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>100% browser-based</span>
      </div>

      {/* How It Works */}
      <div style={{ marginTop: '8rem', paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>How It Works</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Three simple steps to optimized images — no account needed.</p>
        </div>

        <div className="features-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.7 }}>1</div>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>Drop Your Images</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Drag and drop one or hundreds of images into the upload area. JPEG, PNG, WebP, and AVIF are all supported.
            </p>
          </div>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.7 }}>2</div>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>Adjust Quality</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Use the quality slider to find the perfect balance between file size and visual fidelity. Preview the result in real-time.
            </p>
          </div>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.7 }}>3</div>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>Download Instantly</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Download your compressed images individually. Everything happens locally — your files are never uploaded to any server.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" style={{ marginTop: '8rem', paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Why Choose Fileora</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Everything you need to get the perfect balance between file size and visual fidelity.</p>
        </div>

        <div className="features-grid">
          <div className="card" style={{ padding: '2rem' }}>
            <Zap size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Lightning Fast</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              By processing assets locally in your browser using WebAssembly and native Canvas APIs, we eliminate upload times and guarantee instantaneous results regardless of file size.
            </p>
          </div>
          
          <div className="card" style={{ padding: '2rem' }}>
            <Cpu size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Lossless Quality</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              High-precision engineering meets human-centric minimalism. Our intelligent optimization preserves the visual soul of your images while aggressively stripping unnecessary data bloat.
            </p>
          </div>
          
          <div className="card" style={{ padding: '2rem' }}>
            <Shield size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Privacy Guaranteed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Traditional tools upload your files to a server, process them, and send them back. Fileora processes everything locally in your device's memory. Zero data leaves your browser.
            </p>
          </div>
          
          <div className="card" style={{ padding: '2rem' }}>
            <UploadCloud size={24} color="var(--accent-primary)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Batch Processing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Drop an entire folder of images at once. Fileora processes multiple files in parallel and lets you download them all individually when done.
            </p>
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div style={{ marginTop: '8rem', paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Supported Image Formats</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.7 }}>
            Fileora handles all major image formats used on the web today. Whether you're optimizing photos for a blog, product images for an e-commerce store, or assets for a web app, we've got you covered.
          </p>
        </div>

        <div className="features-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {[
            { fmt: 'JPEG', desc: 'The universal photo format. Ideal for photographs and complex images with gradients and millions of colors.' },
            { fmt: 'PNG', desc: 'Lossless format with transparency support. Best for logos, icons, screenshots, and graphics with sharp edges.' },
            { fmt: 'WebP', desc: 'Google\'s modern format offering 25–35% smaller file sizes than JPEG at equivalent quality. Supported by all major browsers.' },
            { fmt: 'AVIF', desc: 'Next-generation format based on AV1 video codec. Delivers the smallest files with exceptional quality, ideal for cutting-edge web performance.' },
          ].map(({ fmt, desc }) => (
            <div key={fmt} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '48px', height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent-primary)'
              }}>
                {fmt}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{fmt} Compression</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div style={{ marginTop: '8rem', paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Frequently Asked Questions</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Got questions? We've got answers.</p>
        </div>

        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqData.map((item, i) => (
            <details key={i} className="card" style={{ padding: '1.5rem', cursor: 'pointer' }}>
              <summary style={{
                fontWeight: 600,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                listStyle: 'none',
                gap: '1rem'
              }}>
                {item.q}
                <ChevronDown size={18} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
              </summary>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
