import { Helmet } from 'react-helmet-async'
import { Shield, Sparkles, Check, X, ArrowRight, Camera, Key, Info } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import { Link } from 'react-router-dom'

const faqs = [
  {
    q: 'How does Fileora AI Scanner process documents offline?',
    a: 'Fileora uses advanced client-side computer vision (HTML5 Canvas API, Tesseract.js OCR, and mathematical corner detectors) compiled into your local browser workspace. When your camera feeds paper frames, the algorithms run directly in your local CPU to detect boundaries, stretch perspectives, and apply contrast filters. No images are sent to any external server.'
  },
  {
    q: 'Is Fileora Document Scanner free from spyware risks?',
    a: 'Absolutely. Many mobile scanner applications have faced corporate and government bans due to spyware, metadata logging, and data-harvesting concerns. Fileora is 100% open-source and executes inside the standard, secure browser sandbox with zero backend reporting, making it the most secure CamScanner alternative on the market.'
  },
  {
    q: 'Can I scan multi-page documents and compile them into a PDF?',
    a: 'Yes. You can capture multiple page frames sequentially using your webcam or phone camera, reorder or crop individual pages, apply filters, and compile them into a single, optimized, industry-standard PDF document instantly.'
  },
  {
    q: 'Does it support automatic border detection?',
    a: 'Yes. Our client-side boundary algorithm actively scans for high-contrast paper boundaries, automatically recommending cropping coordinate markers to save time during alignment adjustments.'
  }
]

export default function CamscannerAlternative() {
  const comparisonData = [
    { feature: 'Software Spyware Risk', fileora: 'Zero (Open-Source browser sandbox)', competitor: 'High (Banned in multiple territories)', fileoraOk: true, compOk: false },
    { feature: 'Data Privacy Compliance', fileora: '100% Safe (Files never leave device)', competitor: 'Saves images to cloud databases', fileoraOk: true, compOk: false },
    { feature: 'Processing Cost', fileora: '$0 (Free Forever)', competitor: '$50+/yr or heavy watermark', fileoraOk: true, compOk: false },
    { feature: 'Watermarks on export', fileora: 'None (Clean professional PDFs)', competitor: '"Scanned with..." stamp on free', fileoraOk: true, compOk: false },
    { feature: 'Auto-Crop & Filters', fileora: 'Yes (High-contrast B&W & Magic)', competitor: 'Yes (Locked behind premium)', fileoraOk: true, compOk: false },
    { feature: 'Mandatory Signups', fileora: 'No signup, instant utility access', competitor: 'Forces email capture & onboarding', fileoraOk: true, compOk: false },
  ]

  const relatedTools = [
    { title: 'Launch AI Document Scanner', desc: 'Activate camera to scan paper pages directly.', href: '/scanner', badge: 'Active Utility' },
    { title: 'PDF Compressor', desc: 'Reduce scanned PDF size to 100KB or 200KB presets.', href: '/compress-pdf', badge: 'Government Portals' },
    { title: 'Merge PDF', desc: 'Combine scanner exports with separate files instantly.', href: '/merge-pdf', badge: 'Instant' },
    { title: 'Split PDF', desc: 'Deconstruct scanner PDFs into individual image pages.', href: '/split-pdf', badge: 'Quick' },
    { title: 'Passport Photo Maker', desc: 'Align and format facial crops to passport templates.', href: '/passport-photo', badge: 'Tools' },
    { title: 'Sign PDF Documents', desc: 'Draw responsive e-signatures onto scanned pages.', href: '/sign-pdf', badge: 'E-Sign' },
  ]

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora - Privacy-First CamScanner Alternative',
    url: 'https://fileora.tech/alternative/camscanner',
    description: 'The secure online alternative to CamScanner. Scan paper sheets, adjust perspective crops, apply high-contrast document filters, and compile PDFs locally.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Best Free CamScanner Alternative: 100% Secure & Online | Fileora</title>
        <meta name="description" content="Looking for a secure CamScanner alternative? Scan documents securely in your browser with Fileora. Absolute privacy, automatic cropping, no watermarks." />
        <link rel="canonical" href="https://fileora.tech/alternative/camscanner" data-rh="true" />
        <meta property="og:title" content="Best Free CamScanner Alternative: 100% Secure & Online | Fileora" />
        <meta property="og:description" content="Protect your personal data. Convert physical documents to optimized PDF scans directly in your browser. Automatic crop borders, perspective grids, no watermarks." />
        <meta property="og:url" content="https://fileora.tech/alternative/camscanner" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Best Free CamScanner Alternative: 100% Secure & Online | Fileora" />
        <meta name="twitter:description" content="Looking for a secure CamScanner alternative? Scan documents securely in your browser with Fileora. Absolute privacy, automatic cropping, no watermarks." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        {/* Hero Section */}
        <section className="tool-hero container" style={{ textAlign: 'center', maxWidth: '800px', margin: '40px auto 60px auto' }}>
          <div className="badge animate-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '16px' }}>
            <Camera size={12} /> Air-Gapped Camera Processing
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text-primary) 50%, #10B981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px', lineHeight: 1.2, display: 'inline-block' }}>
            A Free, Spyware-Free CamScanner Alternative
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Avoid risky mobile apps that harvest your camera feeds and document data. Turn your browser into a secure scanner workspace. Automatic boundary cropping, perspective undistortion, and sharp filters running locally.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/scanner" className="btn btn-primary btn-gradient" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Launch Scanner <ArrowRight size={16} />
            </Link>
            <a href="#compare" className="btn btn-secondary">
              Compare Features
            </a>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="container" style={{ marginBottom: '80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>100% Zero-Leak Guarantee</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Your physical documents contain highly sensitive info (names, ID numbers, addresses). Fileora processes camera frames directly inside browser runtime memory. <strong>Zero packets sent to any backend servers.</strong>
              </p>
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Branding Watermarks</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Do not pay premium fees just to remove ugly "Scanned by..." stamps. Compile fully clean, professional, high-fidelity PDFs ready for <strong>corporate submissions, passports, or university portals.</strong>
              </p>
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Advanced Computer Vision</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Fileora's workspace offers real-time edge indicators, 4-point quadrilateral alignment grids, perspective deskewing adjustments, and custom B&W filters that <strong>emulate professional document scanners.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Comparison Dashboard */}
        <section id="compare" className="container" style={{ marginBottom: '80px', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Side-by-Side Comparison</h2>
            <p className="tool-description-para-last">How Fileora stacks up against standard mobile scanning applications</p>
          </div>

          <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <caption style={{ display: 'none' }}>Fileora AI Scanner vs CamScanner Feature Comparison</caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Feature Capability</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: '#10B981' }}>Fileora (Web AI Scanner)</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: '#EF4444' }}>CamScanner (Mobile App)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: index === comparisonData.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-primary)' }}>{row.feature}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#10B981', display: 'flex' }}><Check size={16} /></span>
                        {row.fileora}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#EF4444', display: 'flex' }}><X size={16} /></span>
                        {row.competitor}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security Warning Callout */}
        <section className="container" style={{ marginBottom: '80px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(245, 158, 11, 0.05))', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ color: '#F59E0B', display: 'flex', marginTop: '4px' }}>
              <Info size={28} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '6px' }}>Compliance and Corporate Air-Gap Security Notice</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Government policies and IT regulations enforce strict compliance limits on where camera assets can be stored or calculated. Fileora represents a 100% compliant secure client-side sandbox utility since zero packets leave your device, matching all corporate compliance and GDPR regulations.
              </p>
            </div>
          </div>
        </section>

        {/* Local Tools Launching Grid */}
        <section id="tools" className="container" style={{ marginBottom: '80px', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Launch Local Fileora Tools</h2>
            <p className="tool-description-para-last">No wait times. Click a utility below to start converting client-side instantly.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {relatedTools.map((t, idx) => (
              <Link 
                key={idx}
                to={t.href}
                style={{ 
                  textDecoration: 'none',
                  padding: '20px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  transition: 'transform 0.2s, border-color 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                className="tool-hover-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--bg-tertiary)', color: '#6EE7B7', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{t.badge}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}><ArrowRight size={14} /></span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{t.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{t.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="container" style={{ maxWidth: '800px', margin: '0 auto 80px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Frequently Asked Questions</h2>
            <p className="tool-description-para-last">Have questions about browser processing? Find details here.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{faq.q}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <style>{`
        .tool-hover-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary, #3B82F6) !important;
        }
      `}</style>
    </div>
  )
}
