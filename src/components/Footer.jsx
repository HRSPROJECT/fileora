import React from 'react';

const LogoSVG = ({ size = 32, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
    <defs>
      <linearGradient id="logoGradFooter" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--accent-hover)" />
        <stop offset="1" stopColor="#60A5FA" />
      </linearGradient>
    </defs>
    <path d="M16 7C11.0294 7 7 11.0294 7 16C7 20.9706 11.0294 25 16 25C20.9706 25 25 20.9706 25 16C25 11.0294 20.9706 7 16 7ZM16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22Z" fill="url(#logoGradFooter)"/>
    <circle cx="16" cy="16" r="3" fill="url(#logoGradFooter)"/>
    <path d="M12.5 12.5L10.5 10.5M19.5 12.5L21.5 10.5M12.5 19.5L10.5 21.5M19.5 19.5L21.5 21.5" stroke="url(#logoGradFooter)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const Footer = () => {
  return (
    <footer style={{
      padding: '4rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderTop: '1px solid var(--border-color)',
      marginTop: '6rem',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, marginBottom: '2rem', fontSize: '1.25rem', letterSpacing: '-0.025em', opacity: 0.8, filter: 'grayscale(100%)' }}>
        <LogoSVG size={28} />
        <span>Fileora</span>
      </div>
      
      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        <a href="https://github.com/HRSPROJECT/image-compressor" target="_blank" rel="noopener noreferrer">GitHub Repo</a>
        <a href="#support">Support</a>
      </div>
      
      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
        © {new Date().getFullYear()} Fileora Optical Labs. Precision-engineered optimization.
      </div>
    </footer>
  );
};

export default Footer;
