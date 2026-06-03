import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { FileLock2, ArrowLeft, Shield, Unlock, Download } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { decryptPDF, isEncrypted } from '../utils/pdfDecryptPatch'
import { downloadBlob, formatBytes } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'Is it safe to unlock confidential files on Fileora?', a: 'Completely. The decryption is performed 100% locally inside your web browser. The password and PDF contents are never transmitted across the internet.' },
  { q: 'Can I unlock a PDF if I do not know the password?', a: 'No. This tool is designed to remove the password protection from a file where you already know the password, sparing you from typing it repeatedly.' },
  { q: 'Will the unlocked PDF have any watermark?', a: 'No. Fileora does not add watermark, advertisement, or page limit structures to your documents.' },
]

export default function UnlockPdf() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [unlockedBlob, setUnlockedBlob] = useState(null)
  const [passwordRequired, setPasswordRequired] = useState(false)

  const handleFile = async (selectedFile) => {
    setError('')
    setPassword('')
    setUnlockedBlob(null)
    setPasswordRequired(false)
    setFile(selectedFile)

    try {
      const bytes = await selectedFile.arrayBuffer()
      const uint8 = new Uint8Array(bytes)
      const info = await isEncrypted(uint8)
      if (info.encrypted) {
        setPasswordRequired(true)
      } else {
        setUnlockedBlob(new Blob([uint8], { type: 'application/pdf' }))
      }
    } catch (err) {
      console.error(err)
      setError('Could not analyze the PDF file structure.')
    }
  }

  const runDecrypt = async () => {
    if (!file || !password) return
    setProcessing(true)
    setError('')
    try {
      await new Promise((r) => setTimeout(r, 1000))
      const bytes = await file.arrayBuffer()
      const uint8 = new Uint8Array(bytes)
      const decrypted = await decryptPDF(uint8, password)
      setUnlockedBlob(new Blob([decrypted], { type: 'application/pdf' }))
      setPasswordRequired(false)
    } catch (err) {
      setError('Incorrect password or unsupported encryption. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!unlockedBlob) return
    const name = file.name.replace(/\.pdf$/i, '')
    downloadBlob(unlockedBlob, `${name}-unlocked.pdf`)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Password Remover',
    url: 'https://fileora.tech/unlock-pdf',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Free PDF Password Remover — Unlock PDF Online | Fileora</title>
        <meta name="description" content="Remove password from PDF files online for free. Unlock PDF instantly in your browser. No signup, no server uploads, completely private." />
        <link rel="canonical" href="https://fileora.tech/unlock-pdf" data-rh="true" />
        <meta property="og:title" content="Free PDF Password Remover — Unlock PDF Online | Fileora" />
        <meta property="og:description" content="Remove password from PDF files online for free. Unlock PDF instantly in your browser. No signup, no server uploads, completely private." />
        <meta property="og:url" content="https://fileora.tech/unlock-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free PDF Password Remover — Unlock PDF Online | Fileora" />
        <meta name="twitter:description" content="Remove password from PDF files online for free. Unlock PDF instantly in your browser. No signup, no server uploads, completely private." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Online PDF Password Remover</h1>
          <p>Remove passwords and restrictions from PDF files instantly. 100% private decryption right inside your browser.</p>
        </section>

        {!file ? (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a password protected PDF file"
              error={error}
              onFiles={(files) => {
                const next = files[0]
                if (!next || next.type !== 'application/pdf') {
                  setError('Please select a valid PDF file.')
                  return
                }
                handleFile(next)
              }}
            />
          </div>
        ) : (
          <section className="workspace-panel">
            {/* Display status or PDF preview if unlocked */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '400px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {unlockedBlob ? (
                <iframe
                  src={URL.createObjectURL(unlockedBlob) + '#toolbar=0'}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <FileLock2 size={48} className="animate-pulse" style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Password Required</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Provide the decryption key to unlock page rendering.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Input Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setFile(null)} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Secure</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{file.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(file.size)}</p>
              </div>

              {passwordRequired && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PDF Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                  <button
                    className="btn btn-primary btn-gradient"
                    onClick={runDecrypt}
                    disabled={processing || !password}
                    style={{ padding: '12px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', marginTop: '4px' }}
                  >
                    <Unlock size={16} /> {processing ? 'Unlocking structural nodes...' : 'Decrypt PDF'}
                  </button>
                </div>
              )}

              {error && <p className="error-message">{error}</p>}

              {unlockedBlob && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>
                    Successfully Decrypted!
                  </div>
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownload}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px' }}
                    >
                      <Download size={18} /> Download Decrypted PDF
                    </button>
                    {unlockedBlob && (
                      <SecureShareButton 
                        file={unlockedBlob} 
                        fileName={`${file.name.replace(/\.pdf$/i, '')}-unlocked.pdf`} 
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>100% Private, Zero Server Upload PDF Password Remover</h2>
          <p className="tool-description-para">
            Safely unlock bank statements, salary slips, and confidential tax documents. 
            Because this tool executes completely inside your local browser memory space, your password is never 
            transmitted across any network, safeguarding your private credentials.
          </p>
          <p className="tool-description-para-last">
            ✓ Absolute key security · ✓ Instant removal of print/edit locks · ✓ High efficiency copy speeds.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload Locked PDF', 'Drag or select your password protected PDF file.'],
          ['Provide Password', 'Type the open password key into the workspace overlay.'],
          ['Download Decrypted PDF', 'Save the password-free document immediately in one click.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/compress-pdf" className="btn btn-secondary btn-related">PDF Compressor</a>
            <a href="/split-pdf" className="btn btn-secondary btn-related">Split PDF</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
