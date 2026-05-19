import React, { useState } from 'react';
import { Moon, Sun, Share } from 'lucide-react';

const LogoSVG = ({ size = 32, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--accent-hover)" />
        <stop offset="1" stopColor="#60A5FA" />
      </linearGradient>
    </defs>
    <path d="M16 7C11.0294 7 7 11.0294 7 16C7 20.9706 11.0294 25 16 25C20.9706 25 25 20.9706 25 16C25 11.0294 20.9706 7 16 7ZM16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22Z" fill="url(#logoGrad)"/>
    <circle cx="16" cy="16" r="3" fill="url(#logoGrad)"/>
    <path d="M12.5 12.5L10.5 10.5M19.5 12.5L21.5 10.5M12.5 19.5L10.5 21.5M19.5 19.5L21.5 21.5" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const GithubIcon = ({ size = 20 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Navbar = ({ theme, toggleTheme }) => {
  const [showToast, setShowToast] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Fileora - Privacy-First Image Compressor',
          text: 'Compress images locally in your browser without losing quality!',
          url: url,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border-color)',
        transition: 'background-color var(--transition-normal)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.35rem', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          <LogoSVG size={36} />
          <span>Fileora</span>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          <a href="#features" style={{ transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}>Features</a>
          <a href="#tools" style={{ transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}>
            All Tools
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '1rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Coming Soon</span>
          </a>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a 
            href="https://github.com/HRSPROJECT/image-compressor" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-ghost hide-on-mobile-text" 
            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }} 
            title="Open Source on GitHub"
          >
            <GithubIcon size={20} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Open Source</span>
          </a>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }}></div>
          <button onClick={handleShare} className="btn btn-ghost" style={{ padding: '0.5rem' }} aria-label="Share">
            <Share size={20} />
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: '0.5rem' }} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Simple Toast Notification for Share fallback */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '2rem',
          backgroundColor: 'var(--text-primary)',
          color: 'var(--bg-primary)',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          Link copied to clipboard!
        </div>
      )}
    </>
  );
};

export default Navbar;
