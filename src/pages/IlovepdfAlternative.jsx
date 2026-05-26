import { Helmet } from 'react-helmet-async'
import { Shield, Sparkles, Check, X, ArrowRight, Zap, Lock, Info, Landmark } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import { Link } from 'react-router-dom'

const faqs = [
  {
    q: 'Why is Fileora a safer alternative to iLovePDF?',
    a: 'Unlike iLovePDF, which uploads your private files to cloud servers where they are stored temporarily, Fileora executes 100% of the conversions and processing locally in your browser sandbox. Your files never leave your device, ensuring absolute privacy for financial, personal, or corporate documents.'
  },
  {
    q: 'Are there file size or daily processing limits?',
    a: 'No. Because Fileora does not use expensive server compute power and processes everything on your device, we do not impose any file limits, daily caps, or paywalls. You can process unlimited files of any size entirely for free.'
  },
  {
    q: 'How is Fileora faster than cloud converters?',
    a: 'Cloud tools require uploading the file, waiting for server processing, and downloading the result. Fileora operates directly on local memory using advanced client-side WebAssembly, removing upload/download times entirely. This is especially fast for large PDFs on standard internet connections.'
  },
  {
    q: 'Do I need an internet connection to use Fileora?',
    a: 'Once the page loads, Fileora runs entirely client-side. You can disconnect from the internet or go completely offline and continue to compress, merge, split, or convert documents safely.'
  }
]

export default function IlovepdfAlternative() {
  const comparisonData = [
    { feature: 'Where processing happens', fileora: '100% Offline (Local Browser)', competitor: 'Cloud Servers (Uploaded)', fileoraOk: true, compOk: false },
    { feature: 'Confidentiality & Security', fileora: 'Guaranteed (Files never leave device)', competitor: 'Files stored up to 2 hours', fileoraOk: true, compOk: false },
    { feature: 'Daily file limits', fileora: 'Unlimited (Free Forever)', competitor: 'Strict limits (Paid Upgrade)', fileoraOk: true, compOk: false },
    { feature: 'File size limits', fileora: 'Unlimited', competitor: 'Strict limits (e.g. 15MB/100MB)', fileoraOk: true, compOk: false },
    { feature: 'Speed', fileora: 'Instant (No upload wait)', competitor: 'Slow (Upload/Download bottleneck)', fileoraOk: true, compOk: false },
    { feature: 'Mandatory Signup', fileora: 'No signup, clean interface', competitor: 'Upsells & Popups', fileoraOk: true, compOk: false },
  ]

  const relatedTools = [
    { title: 'PDF Compressor', desc: 'Shrink PDFs to 100KB, 200KB, or 500KB.', href: '/compress-pdf', badge: 'Popular' },
    { title: 'PDF to Word', desc: 'Convert PDF files to editable DOCX text.', href: '/pdf-to-word', badge: 'Advanced' },
    { title: 'Word to PDF', desc: 'Convert Word documents to clean PDFs.', href: '/word-to-pdf', badge: 'High Quality' },
    { title: 'Merge PDF', desc: 'Combine multiple PDF documents instantly.', href: '/merge-pdf', badge: 'Offline' },
    { title: 'Split PDF', desc: 'Extract ranges or individual pages cleanly.', href: '/split-pdf', badge: 'Quick' },
    { title: 'AI Document Scanner', desc: 'Scan and auto-crop paper to PDFs.', href: '/scanner', badge: 'Hot' },
  ]

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora - Privacy-First iLovePDF Alternative',
    url: 'https://fileora.tech/alternative/ilovepdf',
    description: 'The ultimate 100% private, browser-based iLovePDF alternative. Compress, merge, split and convert PDFs offline without server uploads.',
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
        <title>Best iLovePDF Alternative: 100% Free, Private & Offline | Fileora</title>
        <meta name="description" content="Looking for a secure iLovePDF alternative? Discover Fileora. Process PDF, Word, and images locally in your browser. No files uploaded, no limits, no signup." />
        <link rel="canonical" href="https://fileora.tech/alternative/ilovepdf" data-rh="true" />
        <meta property="og:title" content="Best iLovePDF Alternative: 100% Free, Private & Offline | Fileora" />
        <meta property="og:description" content="Stop uploading confidential files. Compress, convert, merge and split PDFs entirely inside your browser securely with Fileora. No limits." />
        <meta property="og:url" content="https://fileora.tech/alternative/ilovepdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Best iLovePDF Alternative: 100% Free, Private & Offline | Fileora" />
        <meta name="twitter:description" content="Looking for a secure iLovePDF alternative? Discover Fileora. Process PDF, Word, and images locally in your browser. No files uploaded, no limits, no signup." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        {/* Hero Section */}
        <section className="tool-hero container" style={{ textAlign: 'center', maxWidth: '800px', margin: '40px auto 60px auto' }}>
          <div className="badge animate-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(110, 231, 183, 0.1)', color: '#6EE7B7', border: '1px solid rgba(110, 231, 183, 0.2)', marginBottom: '16px' }}>
            <Shield size={12} /> 100% Secure Client-Side Engine
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.2 }}>
            The Ultimate Privacy-First <span style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>iLovePDF Alternative</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Why upload private, confidential documents to external servers? Compress, merge, split, convert, and sign PDF files 100% locally in your browser. Absolute safety, zero signup, and no size limits.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a href="#compare" className="btn btn-primary btn-gradient" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Compare Specs <ArrowRight size={16} />
            </a>
            <a href="#tools" className="btn btn-secondary">
              Launch Local Tools
            </a>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="container" style={{ marginBottom: '80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>100% Air-Gapped Privacy</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Other platforms upload your files to third-party databases. Fileora processes your data directly inside your browser memory using HTML5 and WebAssembly. <strong>Your documents remain yours.</strong>
              </p>
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Network Bottleneck</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Tired of waiting for 100MB documents to upload and download? Fileora works at lightning-fast speed because there is no upload lag. <strong>Large PDF compression is done instantly on device.</strong>
              </p>
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Paywalls or Signup</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Forget daily quotas, paywalls, premium packages, or aggressive email subscriptions. Get unlimited, free access to all utility converters with a <strong>clean workspace.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Comparison Dashboard */}
        <section id="compare" className="container" style={{ marginBottom: '80px', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Side-by-Side Comparison</h2>
            <p className="tool-description-para-last">How Fileora stacks up against standard cloud utility models</p>
          </div>

          <div style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <caption style={{ display: 'none' }}>Fileora vs iLovePDF Feature Comparison</caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Capability</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: '#10B981' }}>Fileora (Local Engine)</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: '#EF4444' }}>iLovePDF (Cloud Engine)</th>
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
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '6px' }}>Attention: Corporate &amp; Government Security Notice</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Uploading proprietary spreadsheets, customer registries, scanned passports, or tax forms violates many strict corporate IT directives and government policies (e.g. GDPR, HIPAA, Indian IT Act). Because **Fileora** processes everything directly in your browser, it is fully compliant with air-gapped data security regulations.
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
