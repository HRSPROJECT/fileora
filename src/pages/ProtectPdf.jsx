import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Shield, ArrowLeft, Download, Sparkles, Eye, EyeOff, Lock, Check } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'What is the difference between a user password and an owner password?', a: 'A user password (open password) restricts who can open and view the PDF. An owner password restricts document permissions such as high-resolution printing, copy-pasting content, and page editing.' },
  { q: 'How strong is the encryption used?', a: 'We use the standard secure client-side encryption algorithms supported by the pdf-lib binary engines, conforming to standard PDF protection specs.' },
  { q: 'Can someone bypass this password protection easily?', a: 'No. Fileora creates proper industry-standard PDF password layers. Any standard compliant PDF reader (like Adobe Acrobat, Apple Preview, Google Chrome) will strictly enforce the password and editing permissions.' },
  { q: 'Is my password or file ever sent to a server?', a: 'Absolutely not. The encryption process occurs completely inside your local browser memory space using JavaScript. Your passwords and PDF file nodes never touch the network.' }
]

export default function ProtectPdf() {
  const [file, setFile] = useState(null)
  const [userPassword, setUserPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showUserPass, setShowUserPass] = useState(false)
  const [showOwnerPass, setShowOwnerPass] = useState(false)
  
  // Permission states
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(true)
  const [allowModifying, setAllowModifying] = useState(true)

  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [downloadableBlob, setDownloadableBlob] = useState(null)

  const handleFile = (selectedFile) => {
    setError('')
    setDownloadableBlob(null)
    setFile(selectedFile)
  }

  // Basic password strength checker
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: 'Empty', score: 0, color: 'var(--text-tertiary)' }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 10) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 1) return { label: 'Weak ⚠️', score: 20, color: '#EF4444' }
    if (score <= 3) return { label: 'Medium ⚡', score: 60, color: '#F59E0B' }
    return { label: 'Strong 💪', score: 100, color: '#10B981' }
  }

  const runProtect = async () => {
    if (!file) return
    if (!userPassword && !ownerPassword) {
      setError('Please set at least a user password or an owner password.')
      return
    }

    setProcessing(true)
    setProgressText('Compiling PDF encryption vectors...')
    setError('')

    try {
      await new Promise((r) => setTimeout(r, 600))
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      
      // Setup permission configurations for encryption
      const encryptOptions = {
        userPassword: userPassword || undefined,
        ownerPassword: ownerPassword || undefined,
        permissions: {
          printing: allowPrinting ? 'highResolution' : 'none',
          copying: allowCopying,
          modifying: allowModifying,
          annotating: allowModifying,
          fillingForms: allowModifying
        }
      }

      pdfDoc.encrypt(encryptOptions)

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      setDownloadableBlob(blob)
    } catch (err) {
      console.error(err)
      setError('Failed to encrypt the PDF document. Make sure the source document is not already password protected.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const handleDownload = () => {
    if (!downloadableBlob) return
    downloadBlob(downloadableBlob, `${basename(file.name)}-protected.pdf`)
  }

  const handleReset = () => {
    setFile(null)
    setUserPassword('')
    setOwnerPassword('')
    setDownloadableBlob(null)
    setError('')
  }

  const strength = getPasswordStrength(userPassword)

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Protector',
    url: 'https://fileora.tech/protect-pdf',
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
        <title>Protect PDF - Add Password & Lock PDF Online | Fileora</title>
        <meta name="description" content="Secure your PDF files for free online. Set opening passwords, edit lock codes, copy-protection, and printing blocks locally in your browser." />
        <link rel="canonical" href="https://fileora.tech/protect-pdf" data-rh="true" />
        <meta property="og:title" content="Protect PDF - Add Password & Lock PDF Online | Fileora" />
        <meta property="og:description" content="Secure your PDF files for free online. Set opening passwords, edit lock codes, copy-protection, and printing blocks locally in your browser." />
        <meta property="og:url" content="https://fileora.tech/protect-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Protect PDF - Add Password & Lock PDF Online | Fileora" />
        <meta name="twitter:description" content="Secure your PDF files for free online. Set opening passwords, edit lock codes, copy-protection, and printing blocks locally in your browser." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Protect PDF Online</h1>
          <p>Enforce strong password locks and user permission controls. Secure bank statements, agreements, and blueprints client-side.</p>
        </section>

        {!file && (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF document to password protect"
              error={error}
              onFiles={(files) => {
                const next = files[0]
                if (next && next.type === 'application/pdf') {
                  handleFile(next)
                } else {
                  setError('Please select a valid PDF file.')
                }
              }}
            />
          </div>
        )}

        {file && (
          <section className="workspace-panel" style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
                  <ArrowLeft size={16} /> Choose Different File
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>File: {file.name} ({formatBytes(file.size)})</span>
              </div>

              {error && (
                <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}

              {!downloadableBlob ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }} className="mobile-grid-1col">
                  {/* Left Side: Passwords Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Set Passwords</h3>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Password to Open PDF</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showUserPass ? 'text' : 'password'}
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="Required to open file"
                          style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserPass(!showUserPass)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          {showUserPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {userPassword && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                            <span className="tool-description-para-last">Password Strength:</span>
                            <span style={{ fontWeight: 'bold', color: strength.color }}>{strength.label}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${strength.score}%`, height: '100%', backgroundColor: strength.color, transition: 'width 0.2s' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Permissions Password (Owner)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showOwnerPass ? 'text' : 'password'}
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          placeholder="Locks editing & formatting overrides"
                          style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOwnerPass(!showOwnerPass)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          {showOwnerPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Permissions Locks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Lock Permissions</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          id="allow-printing"
                          checked={allowPrinting}
                          onChange={(e) => setAllowPrinting(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <label htmlFor="allow-printing" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                          Allow High-Resolution Printing
                        </label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          id="allow-copying"
                          checked={allowCopying}
                          onChange={(e) => setAllowCopying(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <label htmlFor="allow-copying" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                          Allow Content & Text Copying
                        </label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          id="allow-modifying"
                          checked={allowModifying}
                          onChange={(e) => setAllowModifying(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <label htmlFor="allow-modifying" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                          Allow Modifying & Document Assembly
                        </label>
                      </div>
                    </div>

                    {processing ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{progressText}</span>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-gradient"
                        onClick={runProtect}
                        style={{ marginTop: 'auto', padding: '12px', borderRadius: '6px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Shield size={16} /> Encrypt PDF Document
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', marginBottom: '8px' }}>
                    <Check size={28} />
                  </div>
                  
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Successfully Locked!</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Your document has been locked securely using local javascript encryption keys.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '360px', marginTop: '8px' }}>
                    <button onClick={handleDownload} className="btn btn-primary btn-gradient" style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Download size={16} /> Download Protected PDF
                    </button>
                    {downloadableBlob && (
                      <SecureShareButton 
                        file={downloadableBlob} 
                        fileName={`${basename(file.name)}-protected.pdf`} 
                        style={{ padding: '12px' }}
                      />
                    )}
                  </div>
                  <button onClick={() => setDownloadableBlob(null)} className="btn btn-ghost" style={{ fontSize: '12px' }}>
                    Adjust Security Settings
                  </button>
                </div>
              )}

            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium Client-Side Security Protection for PDF Files</h2>
          <p className="tool-description-para">
            Encrypt financial portfolios, confidential business contracts, and legal submissions instantly. 
            Because this tool executes 100% inside your local sandbox memory space, your original PDFs and security passwords are never sent to remote servers.
          </p>
          <p className="tool-description-para-last">
            ✓ Professional open and permissions passlocks · ✓ Granular copy/edit restriction flags · ✓ Zero server latency.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload Target PDF', 'Select any PDF document up to 100MB safely inside the workspace.'],
          ['Configure Password Passlocks', 'Assign standard open passwords, permission edit codes, and restrict print/copy triggers.'],
          ['Download Encrypted Output', 'Compile standard secure lock vectors client-side in a fraction of a second.']
        ]} />
        <FaqSection faqs={faqs} />
      </main>
      <Footer />
    </div>
  )
}
