import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span>F</span>
    </span>
  )
}

function GithubIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5a5.4 5.4 0 0 0-1-3.5c.3-1.2.3-2.4 0-3.5 0 0-1 0-3 1.5a12.4 12.4 0 0 0-8 0C6 2 5 2 5 2c-.3 1.1-.3 2.3 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.5.6-.8 1.4-.9 2.2" />
      <path d="M9 18c-4.5 2-5-2-7-2" />
    </svg>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isHome = location.pathname === '/'
  const toolsHref = isHome ? '#tools' : '/#tools'

  const close = () => {
    setOpen(false)
    setShowDropdown(false)
  }

  const [showDropdown, setShowDropdown] = useState(false)

  const imageTools = [
    { name: 'Image Compressor', to: '/compress' },
    { name: 'Image Resizer', to: '/resize' },
    { name: 'Image Converter', to: '/convert' },
    { name: 'Image to PDF', to: '/image-to-pdf' },
    { name: 'PNG to PDF', to: '/png-to-pdf' },
    { name: 'HEIC to JPG', to: '/heic-to-jpg' },
    { name: 'JPG to PDF', to: '/jpg-to-pdf' },
    { name: 'Passport Photo', to: '/passport-photo' },
  ]

  const pdfTools = [
    { name: 'AI Document Scanner', to: '/scanner' },
    { name: 'PDF Compressor', to: '/compress-pdf' },
    { name: 'Merge PDF', to: '/merge-pdf' },
    { name: 'Split PDF', to: '/split-pdf' },
    { name: 'Unlock PDF', to: '/unlock-pdf' },
    { name: 'Resize PDF', to: '/resize-pdf' },
    { name: 'Crop PDF', to: '/crop-pdf' },
    { name: 'PDF to JPG', to: '/pdf-to-jpg' },
    { name: 'Rotate PDF', to: '/rotate-pdf' },
    { name: 'Watermark PDF', to: '/watermark-pdf' },
    { name: 'Add Page Numbers', to: '/number-pdf' },
    { name: 'Protect PDF', to: '/protect-pdf' },
    { name: 'Sign PDF', to: '/sign-pdf' },
    { name: 'PDF to Word', to: '/pdf-to-word' },
    { name: 'Word to PDF', to: '/word-to-pdf' },
  ]

  const videoTools = [
    { name: 'MOV to MP4', to: '/mov-to-mp4' },
    { name: 'Video Compressor', to: '/compress-video' },
    { name: 'MP4 to MP3', to: '/mp4-to-mp3' },
    { name: 'Trim Video', to: '/trim-video' },
    { name: 'Merge Video', to: '/merge-video' },
    { name: 'MOV to MP3', to: '/mov-to-mp3' },
    { name: 'Video Repeater', to: '/repeat-video' },
  ]

  return (
    <header className="site-header site-header-sticky">
      <nav className="site-nav" aria-label="Primary navigation">
        <Link to="/" className="brand" onClick={close}>
          <Logo />
          <span>Fileora</span>
        </Link>

        <div className="nav-links nav-links-relative">
          <div 
            className="dropdown-trigger dropdown-trigger-inline"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <a 
              className={`nav-link nav-link-alltools ${isHome ? 'active' : ''}`}
              href={toolsHref}
              onClick={(e) => {
                e.preventDefault()
                setShowDropdown(!showDropdown)
              }}
            >
              All Tools <span className={`alltools-arrow ${showDropdown ? 'rotate' : ''}`}>▼</span>
            </a>
            
            {showDropdown && (
              <div className="dropdown-menu-premium">
                <div>
                  <div className="dropdown-category-title">IMAGE TOOLS</div>
                  {imageTools.map(t => (
                    <NavLink 
                      key={t.to} 
                      to={t.to} 
                      onClick={close}
                      className={({ isActive }) => `nav-dropdown-item${isActive ? ' active' : ''}`}
                    >
                      {t.name}
                    </NavLink>
                  ))}
                </div>
                <div>
                  <div className="dropdown-category-title">PDF TOOLS</div>
                  {pdfTools.map(t => (
                    <NavLink 
                      key={t.to} 
                      to={t.to} 
                      onClick={close}
                      className={({ isActive }) => `nav-dropdown-item${isActive ? ' active' : ''}`}
                    >
                      {t.name}
                    </NavLink>
                  ))}
                </div>
                <div>
                  <div className="dropdown-category-title">VIDEO TOOLS</div>
                  {videoTools.map(t => (
                    <NavLink 
                      key={t.to} 
                      to={t.to} 
                      onClick={close}
                      className={({ isActive }) => `nav-dropdown-item${isActive ? ' active' : ''}`}
                    >
                      {t.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>

          <NavLink className="nav-link" to="/scanner">
            AI Scanner
          </NavLink>
          <NavLink
            className="nav-link nav-link-share-pulsing"
            to="/share"
            title="Requires internet to pair devices. Files are not uploaded."
            style={{ color: 'var(--accent-primary)', fontWeight: '600' }}
          >
            P2P Share
            <span className="network-share-hint">Wi‑Fi</span>
          </NavLink>

          <a
            className="nav-link"
            href="https://github.com/HRSPROJECT/image-compressor"
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon />
            Open Source
          </a>
          <a
            className="nav-link"
            href="https://www.producthunt.com/products/fileora-free-online-file-tools"
            target="_blank"
            rel="noopener noreferrer"
          >
            Product Hunt
          </a>
          <NavLink className="nav-pill" to="/compress">
            Compress
          </NavLink>
        </div>

        <button
          className="icon-button toggle-theme-button"
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button
          className="icon-button mobile-menu-button"
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="mobile-drawer mobile-drawer-scrollable">
          <a href={toolsHref} onClick={close} className="mobile-drawer-header">All Tools</a>
          <NavLink to="/share" onClick={close} className="mobile-nav-link" style={{ fontWeight: '700', color: 'var(--accent-primary)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '12px', marginBottom: '8px' }}>
            🔒 P2P Share <span className="network-share-hint">Wi‑Fi required</span>
          </NavLink>

          
          <div className="mobile-tools-group">
            <span className="mobile-category-title">IMAGE TOOLS</span>
            {imageTools.map(t => (
              <NavLink key={t.to} to={t.to} onClick={close} className="mobile-nav-link">{t.name}</NavLink>
            ))}
          </div>

          <div className="mobile-tools-group">
            <span className="mobile-category-title">PDF TOOLS</span>
            {pdfTools.map(t => (
              <NavLink key={t.to} to={t.to} onClick={close} className="mobile-nav-link">{t.name}</NavLink>
            ))}
          </div>

          <div className="mobile-tools-group">
            <span className="mobile-category-title">VIDEO TOOLS</span>
            {videoTools.map(t => (
              <NavLink key={t.to} to={t.to} onClick={close} className="mobile-nav-link">{t.name}</NavLink>
            ))}
          </div>

          <a href="https://github.com/HRSPROJECT/image-compressor" target="_blank" rel="noreferrer" onClick={close} className="mobile-github-link">
            GitHub / Open Source
          </a>
          <a href="https://www.producthunt.com/products/fileora-free-online-file-tools" target="_blank" rel="noopener noreferrer" onClick={close} className="mobile-ph-link">
            Product Hunt
          </a>
        </div>
      )}
      <style>{`
        .site-header-sticky {
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-links-relative {
          position: relative;
        }
        .dropdown-trigger-inline {
          display: inline-block;
        }
        .nav-link-alltools {
          display: flex !important;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .alltools-arrow {
          font-size: 10px;
          transition: transform 0.2s;
        }
        .alltools-arrow.rotate {
          transform: rotate(180deg);
        }
        .nav-dropdown-item {
          display: block;
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          transition: background 0.2s;
        }
        .nav-dropdown-item.active {
          color: #6EE7B7;
        }
        .mobile-tools-group {
          padding: 8px 0;
        }
        .mobile-nav-link {
          font-size: 14px;
          padding: 12px 16px;
          display: block;
          color: var(--text-primary);
          text-decoration: none;
          min-height: 48px;
        }
        .dropdown-menu-premium {
          position: absolute;
          top: 100%;
          left: 0;
          background: var(--bg-secondary, #111827);
          border: 1px solid var(--border-color, #1F2937);
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          padding: 16px;
          display: grid;
          grid-template-columns: 200px 200px 200px;
          gap: 16px;
          z-index: 200;
          backdrop-filter: blur(12px);
          margin-top: 4px;
        }
        .dropdown-category-title {
          font-size: 11px;
          font-weight: bold;
          color: #6EE7B7;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          padding-left: 8px;
        }
        .toggle-theme-button {
          background: transparent;
          color: var(--text-primary);
          margin-left: auto;
          margin-right: 0.5rem;
          padding: 0.5rem;
        }
        .mobile-drawer-scrollable {
          overflow-y: auto;
          max-height: calc(100vh - 60px);
          padding-bottom: 32px;
        }
        .mobile-drawer-header {
          font-weight: bold;
          border-bottom: 1px solid var(--border-color);
          padding: 12px 16px;
          display: block;
          min-height: 48px;
        }
        .mobile-category-title {
          font-size: 11px;
          font-weight: bold;
          color: #6EE7B7;
          letter-spacing: 0.05em;
          display: block;
          margin: 8px 0 4px 8px;
        }
        .mobile-github-link {
          border-top: 1px solid var(--border-color);
          margin-top: 8px;
          padding: 12px 16px;
          display: block;
          min-height: 48px;
        }
        .mobile-ph-link {
          margin-top: 4px;
          padding: 12px 16px;
          display: block;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          min-height: 48px;
        }
        .nav-dropdown-item:hover {
          background: var(--bg-tertiary, #1F2937);
        }
      `}</style>
    </header>
  )
}

