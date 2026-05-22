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

  return (
    <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <nav className="site-nav" aria-label="Primary navigation">
        <Link to="/" className="brand" onClick={close}>
          <Logo />
          <span>Fileora</span>
        </Link>

        <div className="nav-links" style={{ position: 'relative' }}>
          <div 
            className="dropdown-trigger"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
            style={{ display: 'inline-block' }}
          >
            <a 
              className={isHome ? 'nav-link active' : 'nav-link'} 
              href={toolsHref}
              onClick={(e) => {
                e.preventDefault()
                setShowDropdown(!showDropdown)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              All Tools <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: showDropdown ? 'rotate(180deg)' : 'none' }}>▼</span>
            </a>
            
            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                background: 'var(--bg-secondary, #111827)',
                border: '1px solid var(--border-color, #1F2937)',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '220px 220px',
                gap: '16px',
                zIndex: 200,
                backdropFilter: 'blur(12px)',
                marginTop: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6EE7B7', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>IMAGE TOOLS</div>
                  {imageTools.map(t => (
                    <NavLink 
                      key={t.to} 
                      to={t.to} 
                      onClick={close}
                      style={({ isActive }) => ({
                        display: 'block',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        color: isActive ? '#6EE7B7' : 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '13px',
                        transition: 'background 0.2s'
                      })}
                      className="nav-dropdown-item"
                    >
                      {t.name}
                    </NavLink>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6EE7B7', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>PDF TOOLS</div>
                  {pdfTools.map(t => (
                    <NavLink 
                      key={t.to} 
                      to={t.to} 
                      onClick={close}
                      style={({ isActive }) => ({
                        display: 'block',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        color: isActive ? '#6EE7B7' : 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '13px',
                        transition: 'background 0.2s'
                      })}
                      className="nav-dropdown-item"
                    >
                      {t.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a
            className="nav-link"
            href="https://github.com/HRSPROJECT/image-compressor"
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon />
            Open Source
          </a>
          <NavLink className="nav-pill" to="/compress">
            Compress
          </NavLink>
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{ background: 'transparent', color: 'var(--text-primary)', marginLeft: 'auto', marginRight: '0.5rem', padding: '0.5rem' }}
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
        <div className="mobile-drawer" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 60px)', paddingBottom: '32px' }}>
          <a href={toolsHref} onClick={close} style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>All Tools</a>
          
          <div style={{ padding: '8px 0' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6EE7B7', letterSpacing: '0.05em', display: 'block', margin: '8px 0 4px 8px' }}>IMAGE TOOLS</span>
            {imageTools.map(t => (
              <NavLink key={t.to} to={t.to} onClick={close} style={{ fontSize: '14px', padding: '6px 12px', display: 'block' }}>{t.name}</NavLink>
            ))}
          </div>

          <div style={{ padding: '8px 0' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6EE7B7', letterSpacing: '0.05em', display: 'block', margin: '8px 0 4px 8px' }}>PDF TOOLS</span>
            {pdfTools.map(t => (
              <NavLink key={t.to} to={t.to} onClick={close} style={{ fontSize: '14px', padding: '6px 12px', display: 'block' }}>{t.name}</NavLink>
            ))}
          </div>

          <a href="https://github.com/HRSPROJECT/image-compressor" target="_blank" rel="noreferrer" onClick={close} style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '12px' }}>
            GitHub / Open Source
          </a>
        </div>
      )}
      <style>{`
        .nav-dropdown-item:hover {
          background: var(--bg-tertiary, #1F2937);
        }
      `}</style>
    </header>
  )
}

