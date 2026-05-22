import { Link } from 'react-router-dom'

export default function Footer() {
  const links = [
    ['Home', '/'],
    ['Image Compressor', '/compress'],
    ['Image Resizer', '/resize'],
    ['Image Converter', '/convert'],
    ['Image to PDF', '/image-to-pdf'],
    ['PNG to PDF', '/png-to-pdf'],
    ['PDF Compressor', '/compress-pdf'],
    ['Merge PDF', '/merge-pdf'],
    ['Split PDF', '/split-pdf'],
    ['Unlock PDF', '/unlock-pdf'],
    ['Resize PDF', '/resize-pdf'],
    ['Crop PDF', '/crop-pdf'],
    ['PDF to JPG', '/pdf-to-jpg'],
    ['HEIC to JPG', '/heic-to-jpg'],
    ['JPG to PDF', '/jpg-to-pdf'],
    ['Rotate PDF', '/rotate-pdf'],
    ['Watermark PDF', '/watermark-pdf'],
    ['Add Page Numbers', '/number-pdf'],
    ['Passport Photo', '/passport-photo'],
    ['Protect PDF', '/protect-pdf'],
    ['Sign PDF', '/sign-pdf'],
    ['PDF to Word', '/pdf-to-word'],
    ['Word to PDF', '/word-to-pdf'],
  ]

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Link to="/" className="footer-brand">Fileora</Link>
        <nav className="footer-links" aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {links.map(([label, href]) => (
            href.startsWith('/#') ? <a key={href} href={href}>{label}</a> : <Link key={href} to={href}>{label}</Link>
          ))}
        </nav>
        <p style={{ marginTop: '12px' }}>Privacy-first. Files never leave your device.</p>
        <p className="footer-copy">© 2026 Fileora</p>
      </div>
    </footer>
  )
}
