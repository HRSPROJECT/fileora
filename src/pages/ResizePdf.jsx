import { useState, useEffect, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { Scale, ArrowLeft, Shield, Columns, Layout, Download } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'Why resize PDF page dimensions?', a: 'Portals often mandate A4 paper dimensions for forms and Letter size for American corporate submissions. Resizing rescales the content layout into standardized dimensions.' },
  { q: 'Will my layout break when scaling?', a: 'No. Fileora scales both page boundaries and page content streams proportionally, maintaining alignment and element integrity.' },
  { q: 'Is there a watermark added after resizing?', a: 'No. Fileora is 100% free with no additions or modifications to the page layout.' },
]

export default function ResizePdf() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [pageSize, setPageSize] = useState('a4') // 'a4', 'letter', 'a3'
  const [orientation, setOrientation] = useState('portrait') // 'portrait', 'landscape'
  const [processing, setProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)

  const onHandoffFile = useCallback((next) => { setFile(next); setError('') }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('resize-pdf', { onFile: onHandoffFile })

  useEffect(() => {
    if (!file) return
    const readPdf = async () => {
      try {
        const bytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        setPageCount(doc.getPageCount())
      } catch (err) {
        setError('Failed to open PDF. Ensure it is not password protected.')
      }
    }
    readPdf()
  }, [file])

  const runResize = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      await new Promise((r) => setTimeout(r, 1200))
      const bytes = await file.arrayBuffer()
      const source = await PDFDocument.load(bytes)
      const newDoc = await PDFDocument.create()

      // Define standard target dimensions in points (72 points = 1 inch)
      let targetWidth = 595.276 // A4 Width
      let targetHeight = 841.89 // A4 Height

      if (pageSize === 'letter') {
        targetWidth = 612
        targetHeight = 792
      } else if (pageSize === 'a3') {
        targetWidth = 841.89
        targetHeight = 1190.55
      }

      if (orientation === 'landscape') {
        const temp = targetWidth
        targetWidth = targetHeight
        targetHeight = temp
      }

      const copiedPages = await newDoc.copyPages(source, source.getPageIndices())
      copiedPages.forEach((page) => {
        const { width: origWidth, height: origHeight } = page.getSize()
        
        // Resize page size bounding box
        page.setSize(targetWidth, targetHeight)

        // Scale original contents proportionally to fit new dimensions
        const scaleX = targetWidth / origWidth
        const scaleY = targetHeight / origHeight
        page.scale(scaleX, scaleY)

        newDoc.addPage(page)
      })

      const outputBytes = await newDoc.save()
      const blob = new Blob([outputBytes], { type: 'application/pdf' })
      setResultBlob(blob)
    } catch (err) {
      setError('Could not resize PDF. Please verify structure integrity.')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (file) {
      runResize()
    }
  }, [file, pageSize, orientation])

  const handleDownload = () => {
    if (!resultBlob) return
    const name = file.name.replace(/\.pdf$/i, '')
    downloadBlob(resultBlob, `${name}-resized-${pageSize}-${orientation}.pdf`)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Resizer',
    url: 'https://fileora.tech/resize-pdf',
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
        <title>Free PDF Resizer Online — Resize PDF Page Size | Fileora</title>
        <meta name="description" content="Resize PDF pages online for free. Change PDF page size to A4, Letter, A3 and more. Browser-based, no signup required." />
        <link rel="canonical" href="https://fileora.tech/resize-pdf" data-rh="true" />
        <meta property="og:title" content="Free PDF Resizer Online — Resize PDF Page Size | Fileora" />
        <meta property="og:description" content="Resize PDF pages online for free. Change PDF page size to A4, Letter, A3 and more. Browser-based, no signup required." />
        <meta property="og:url" content="https://fileora.tech/resize-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free PDF Resizer Online — Resize PDF Page Size | Fileora" />
        <meta name="twitter:description" content="Resize PDF pages online for free. Change PDF page size to A4, Letter, A3 and more. Browser-based, no signup required." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Online PDF Page Resizer</h1>
          <p>Resize PDF pages to standard A4, A3, Letter dimensions in landscape or portrait. Perfectly scaled in your browser.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {!file ? (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF file to resize dimensions"
              error={error}
              onFiles={(files) => {
                const next = files[0]
                if (!next || next.type !== 'application/pdf') {
                  setError('Please select a valid PDF file.')
                  return
                }
                setFile(next)
              }}
            />
          </div>
        ) : (
          <section className="workspace-panel">
            {/* Left side preview */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '400px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {processing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
                  <div className="loading-spinner"></div>
                  <span>Rescaling PDF page layout and contents...</span>
                </div>
              ) : resultBlob ? (
                <iframe
                  src={URL.createObjectURL(resultBlob) + '#toolbar=0'}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
                />
              ) : (
                <div className="tool-description-para-last">Ready. Select layout options to resize.</div>
              )}
            </div>

            {/* Right side controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setFile(null)} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Local</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{file.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pages: {pageCount} · Size: {formatBytes(file.size)}</p>
              </div>

              {/* Target Standard Dimension Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Target Page Size</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'a4', label: 'A4 Preset', desc: '595 × 841 pt' },
                    { id: 'letter', label: 'US Letter', desc: '612 × 792 pt' },
                    { id: 'a3', label: 'A3 Size', desc: '841 × 1190 pt' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setPageSize(preset.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        backgroundColor: pageSize === preset.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        border: `2px solid ${pageSize === preset.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{preset.label}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Orientation */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Page Orientation</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => setOrientation('portrait')}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: orientation === 'portrait' ? 'var(--bg-tertiary)' : 'transparent',
                      color: orientation === 'portrait' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Columns size={14} /> Portrait
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: orientation === 'landscape' ? 'var(--bg-tertiary)' : 'transparent',
                      color: orientation === 'landscape' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Layout size={14} /> Landscape
                  </button>
                </div>
              </div>

              {error && <p className="error-message">{error}</p>}

              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                <button
                  className="btn btn-primary btn-gradient"
                  onClick={handleDownload}
                  disabled={processing || !resultBlob}
                  style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px' }}
                >
                  <Download size={18} /> Download Resized PDF
                </button>
                {resultBlob && (
                  <SecureShareButton 
                    file={resultBlob} 
                    fileName={`${file ? file.name.replace(/\.pdf$/i, '') : 'document'}-resized-${pageSize}-${orientation}.pdf`} 
                  />
                )}
              </div>
              <ContinueWithBlob
                sourceToolId="resize-pdf"
                blob={resultBlob}
                fileName={file ? `${basename(file.name)}-resized-${pageSize}-${orientation}.pdf` : 'resized.pdf'}
                mimeType="application/pdf"
                disabled={processing || !resultBlob}
              />
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Proportional Scaling PDF Page Resizer</h2>
          <p className="tool-description-para">
            Perfect for preparing documentation matching exact compliance regulations (such as A4 or Letter sizes). 
            Fileora applies affine content transformation matrix coordinates to preserve visual balance and margins.
          </p>
          <p className="tool-description-para-last">
            ✓ Advanced affine scaling · ✓ Support for Letter, A4, A3 Presets · ✓ Fluid orientation toggle.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload PDF Document', 'Upload a PDF file up to 100MB.'],
          ['Choose Size & Orientation', 'Select standard presets (A4, Letter, A3) and toggle Orientation.'],
          ['Save Resized Output', 'Download the proportionally scaled PDF immediately.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/crop-pdf" className="btn btn-secondary btn-related">Crop PDF</a>
            <a href="/compress-pdf" className="btn btn-secondary btn-related">PDF Compressor</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
