import { Helmet } from 'react-helmet-async'
import { Shield, Sparkles, Check, X, ArrowRight, Zap, Ban, Info } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import { Link } from 'react-router-dom'

const faqs = [
  {
    q: 'How does Fileora avoid having a daily limit like Smallpdf?',
    a: 'Smallpdf processes files on heavy cloud servers, which incurs immense compute and hosting costs. To stay profitable, they limit free users to 2 files per day and force a premium subscription. Fileora uses your local browser CPU via WebAssembly to convert files. Since we do not pay for cloud server calculations, we pass 100% of these savings to you, offering unlimited free processing forever.'
  },
  {
    q: 'Are files converted locally as high-quality as Smallpdf?',
    a: 'Yes. Fileora uses state-of-the-art client-side libraries (like pdf-lib, tesseract.js, docx-preview) that compile straight to WebAssembly. This ensures high-fidelity text extraction, vector accuracy, and pixel-perfect conversions equivalent to premium cloud services.'
  },
  {
    q: 'Do I need to sign up to use Fileora?',
    a: 'No. Fileora does not require any account creation, email registration, or credit card signup. Simply open the tool you need, select your files, and obtain your results instantly in a completely ad-free workspace.'
  },
  {
    q: 'Is my data safe with browser-based PDF converters?',
    a: 'Browser-based processing is the safest technology available. Because all operations execute locally on your physical device, no data is sent over the internet to a third-party server. It is practically impossible for your documents to be leaked, hijacked, or kept in external databases.'
  }
]

export default function SmallpdfAlternative() {
  const comparisonData = [
    { feature: 'Daily conversions allowance', fileora: 'Unlimited (Always Free)', competitor: 'Only 2 files per day (Strict limit)', fileoraOk: true, compOk: false },
    { feature: 'Subscription Cost', fileora: '$0 / yr (100% Free)', competitor: '$108+ / yr / user', fileoraOk: true, compOk: false },
    { feature: 'Server-side uploading', fileora: 'Never (100% Client-side sandbox)', competitor: 'Required (Uploaded to servers)', fileoraOk: true, compOk: false },
    { feature: 'Mandatory Account Signup', fileora: 'No signup, no emails, no traps', competitor: 'Pushes signup and premium trial', fileoraOk: true, compOk: false },
    { feature: 'Processing speed', fileora: 'Instant (Saves upload bandwidth)', competitor: 'Requires full upload/download', fileoraOk: true, compOk: false },
    { feature: 'Confidentiality Compliance', fileora: 'Air-gapped (100% GDPR compliant)', competitor: 'Server storage logs', fileoraOk: true, compOk: false },
  ]

  const relatedTools = [
    { title: 'PDF Compressor', desc: 'Reduce PDF sizes locally to 100KB, 200KB, or 500KB.', href: '/compress-pdf', badge: 'Air-Gapped' },
    { title: 'PDF to Word', desc: 'Convert PDFs to standard DOCX files locally.', href: '/pdf-to-word', badge: 'High Fidelity' },
    { title: 'Word to PDF', desc: 'Convert DOCX text sheets to formatted PDFs.', href: '/word-to-pdf', badge: 'Offline' },
    { title: 'AI Document Scanner', desc: 'Auto-scan paper drafts into multipage PDFs.', href: '/scanner', badge: 'Webcam Scan' },
    { title: 'Image Compressor', desc: 'Optimize JPEG/PNG images with live comparisons.', href: '/compress', badge: 'Instant' },
    { title: 'Merge PDF', desc: 'Combine and organize PDF layouts easily.', href: '/merge-pdf', badge: 'No Limits' },
  ]

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora - Free Unlimited Smallpdf Alternative',
    url: 'https://fileora.tech/alternative/smallpdf',
    description: 'The premier free unlimited Smallpdf alternative. Bypass daily conversion quotas and premium subscription walls by processing files locally.',
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
        <title>Free Smallpdf Alternative: Unlimited, No Limits & Private | Fileora</title>
        <meta name="description" content="Tired of the Smallpdf 2-file daily limit? Meet Fileora—the 100% free, unlimited, and private Smallpdf alternative. Process PDFs offline. No signup required." />
        <link rel="canonical" href="https://fileora.tech/alternative/smallpdf" data-rh="true" />
        <meta property="og:title" content="Free Smallpdf Alternative: Unlimited, No Limits & Private | Fileora" />
        <meta property="og:description" content="Convert and compress PDFs without boundaries. Fileora processes files completely inside your browser locally—meaning zero uploads, no quotas, and no subscription traps." />
        <meta property="og:url" content="https://fileora.tech/alternative/smallpdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free Smallpdf Alternative: Unlimited, No Limits & Private | Fileora" />
        <meta name="twitter:description" content="Tired of the Smallpdf 2-file daily limit? Meet Fileora—the 100% free, unlimited, and private Smallpdf alternative. Process PDFs offline. No signup required." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        {/* Hero Section */}
        <section className="tool-hero container" style={{ textAlign: 'center', maxWidth: '800px', margin: '40px auto 60px auto' }}>
          <div className="badge animate-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '16px' }}>
            <Ban size={12} /> Bypass Quotas & Daily Limits
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--text-primary) 50%, #3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px', lineHeight: 1.2, display: 'inline-block' }}>
            A Free, Unlimited Smallpdf Alternative
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Frustrated by the 2-file daily limit and premium payment popups? Fileora gives you unlimited access to high-fidelity document optimization and conversions. 100% browser-based, offline, and completely free.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a href="#compare" className="btn btn-primary btn-gradient" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Compare Specs <ArrowRight size={16} />
            </a>
            <a href="#tools" className="btn btn-secondary">
              Explore Tools
            </a>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="container" style={{ marginBottom: '80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Unlimited Conversions</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                We believe utility tools should be free and accessible. Process hundreds of pages, optimize high-resolution documents, and convert formats infinitely with <strong>absolutely zero restrictions.</strong>
              </p>
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Account Signup</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Do not surrender your email address or personal details to bypass quotas. Fileora provides direct, instant access to all converter engines. <strong>Open the page and work immediately.</strong>
              </p>
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>100% Client-Side Engine</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                By compiling powerful document-processing libraries directly into WebAssembly, your machine handles the operations. Fast calculations with absolute security since <strong>files never touch any server.</strong>
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
              <caption style={{ display: 'none' }}>Fileora vs Smallpdf Feature Comparison</caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Capability</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: '#10B981' }}>Fileora (Local Engine)</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: '#EF4444' }}>Smallpdf (Cloud Engine)</th>
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
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '6px' }}>Attention: Compliance and Corporate Air-Gap Security</h3>
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
