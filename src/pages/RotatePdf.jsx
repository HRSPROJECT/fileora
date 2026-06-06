import { useState, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { RotateCw, RotateCcw, ArrowLeft, Shield, Download, FileText, Sparkles, HelpCircle, Check } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, degrees } from 'pdf-lib'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const faqs = [
  { q: 'Can I rotate individual pages of a PDF, or do I have to rotate all of them?', a: 'You can do both! You can click any individual page in the visual grid to rotate it 90 degrees clockwise, or use the global control panel to rotate all pages of the document at once.' },
  { q: 'Is there a file limit or security concerns with my documents?', a: 'No limits and absolute privacy. The page rotation and PDF assembly occur 100% locally in your browser memory space. The PDF document structure is never uploaded to any remote server.' },
  { q: 'Will the text or image quality in the PDF degrade after rotation?', a: 'Not at all. This tool edits the underlying rotation metadata vectors inside the PDF file structure using pdf-lib. The actual pages are not re-compressed or flattened, ensuring 100% lossless output.' },
  { q: 'Does it support scanned PDFs?', a: 'Yes. It works perfectly with scanned PDFs, text-heavy PDFs, vector layout forms, and large blueprints.' }
]

export default function RotatePdf() {
  const [file, setFile] = useState(null)
  const [pdfDocJS, setPdfDocJS] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [thumbnails, setThumbnails] = useState([]) // array of { pageNum, dataUrl }
  const [rotations, setRotations] = useState({}) // maps pageNum (1-based) to degrees (0, 90, 180, 270)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [downloadableBlob, setDownloadableBlob] = useState(null)

  const onHandoffFile = useCallback((next) => { setFile(next); setError('') }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('rotate-pdf', { onFile: onHandoffFile })

  const handleFile = async (selectedFile) => {
    setError('')
    setFile(selectedFile)
    setPdfDocJS(null)
    setThumbnails([])
    setRotations({})
    setDownloadableBlob(null)
    setProcessing(true)
    setProgressText('Loading PDF metadata...')
    setProgressPercent(20)

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      setPdfDocJS(pdf)
      setTotalPages(pdf.numPages)

      const initialRotations = {}
      const thumbs = []
      const maxThumbs = Math.min(pdf.numPages, 16) // render up to 16 page previews to remain highly responsive

      for (let i = 1; i <= pdf.numPages; i++) {
        initialRotations[i] = 0

        if (i <= maxThumbs) {
          setProgressText(`Rendering page preview ${i}...`)
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 0.25 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          await page.render({ canvasContext: context, viewport }).promise
          thumbs.push({ pageNum: i, dataUrl: canvas.toDataURL('image/jpeg', 0.6) })
        } else {
          thumbs.push({ pageNum: i, dataUrl: null })
        }
        setProgressPercent(Math.round(20 + (i / pdf.numPages) * 60))
      }

      setRotations(initialRotations)
      setThumbnails(thumbs)
    } catch (err) {
      console.error(err)
      setError('Failed to process the PDF document. Make sure it is not encrypted or password-protected.')
      setFile(null)
    } finally {
      setProcessing(false)
      setProgressPercent(0)
      setProgressText('')
    }
  }

  const rotatePage = (pageNum, direction = 90) => {
    setRotations((prev) => {
      const current = prev[pageNum] || 0
      const next = (current + direction + 360) % 360
      return { ...prev, [pageNum]: next }
    })
  }

  const rotateAll = (direction = 90) => {
    setRotations((prev) => {
      const next = {}
      for (let i = 1; i <= totalPages; i++) {
        const current = prev[i] || 0
        next[i] = (current + direction + 360) % 360
      }
      return next
    })
  }

  const runRotate = async () => {
    if (!file) return
    setProcessing(true)
    setProgressText('Processing PDF vector nodes...')
    setProgressPercent(30)
    setError('')

    try {
      await new Promise((r) => setTimeout(r, 600))
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      setProgressPercent(60)

      pages.forEach((page, index) => {
        const pageNum = index + 1
        const rotOffset = rotations[pageNum] || 0
        if (rotOffset !== 0) {
          const currentRotation = page.getRotation().angle
          const finalRotation = (currentRotation + rotOffset) % 360
          page.setRotation(degrees(finalRotation))
        }
      })

      setProgressPercent(90)
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      setDownloadableBlob(blob)
      setProgressPercent(100)
    } catch (err) {
      console.error(err)
      setError('An error occurred while compiling your rotated PDF.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const handleDownload = () => {
    if (!downloadableBlob) return
    downloadBlob(downloadableBlob, `${basename(file.name)}-rotated.pdf`)
  }

  const handleReset = () => {
    setFile(null)
    setPdfDocJS(null)
    setTotalPages(0)
    setThumbnails([])
    setRotations({})
    setDownloadableBlob(null)
    setError('')
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Rotator',
    url: 'https://fileora.tech/rotate-pdf',
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
        <title>Rotate PDF Online - Free Page Rotator | Fileora</title>
        <meta name="description" content="Rotate PDF files online for free. Rotate individual pages or all pages at once. Purely browser-based client-side PDF rotation utility. Lossless and private." />
        <link rel="canonical" href="https://fileora.tech/rotate-pdf" data-rh="true" />
        <meta property="og:title" content="Rotate PDF Online - Free Page Rotator | Fileora" />
        <meta property="og:description" content="Rotate PDF files online for free. Rotate individual pages or all pages at once. Purely browser-based client-side PDF rotation utility. Lossless and private." />
        <meta property="og:url" content="https://fileora.tech/rotate-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Rotate PDF Online - Free Page Rotator | Fileora" />
        <meta name="twitter:description" content="Rotate PDF files online for free. Rotate individual pages or all pages at once. Purely browser-based client-side PDF rotation utility. Lossless and private." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Rotate PDF Online</h1>
          <p>Rotate pages clockwise or counterclockwise. Perfect for correcting upside-down document scans and landscape formats locally.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {processing && progressText && !pdfDocJS && (
          <div className="container" style={{ maxWidth: '640px', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div className="loading-spinner" />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{progressText}</h3>
            <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', margin: '8px auto' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>100% locally on your browser</span>
          </div>
        )}

        {!file && !processing && (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF document file to rotate"
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
        )}

        {file && pdfDocJS && (
          <section className="workspace-panel">
            {/* Left side preview grid */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '450px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Total Pages: {totalPages}
                </span>
                {!downloadableBlob && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => rotateAll(90)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RotateCw size={11} /> Rotate All
                    </button>
                  </div>
                )}
              </div>

              {/* PDF Preview page block */}
              {downloadableBlob ? (
                <iframe
                  src={URL.createObjectURL(downloadableBlob) + '#toolbar=0'}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
                />
              ) : (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', alignContent: 'start' }}>
                  {thumbnails.map((thumb) => {
                    const rotAngle = rotations[thumb.pageNum] || 0
                    return (
                      <div 
                        key={thumb.pageNum}
                        onClick={() => rotatePage(thumb.pageNum, 90)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px 10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'border 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '50%' }}>
                          <RotateCw size={11} color="#fff" />
                        </div>

                        <div style={{ width: '100%', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s ease', transform: `rotate(${rotAngle}deg)` }}>
                          {thumb.dataUrl ? (
                            <img 
                              src={thumb.dataUrl} 
                              alt={`Page ${thumb.pageNum}`} 
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }} 
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <FileText size={24} style={{ color: 'var(--text-tertiary)' }} />
                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Page {thumb.pageNum}</span>
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Page {thumb.pageNum} {rotAngle > 0 && `(${rotAngle}°)`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right side controls panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Local execution</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(file.size)}</p>
              </div>

              {!downloadableBlob ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Quick Batch Rotation</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <button
                        onClick={() => rotateAll(90)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', padding: '10px' }}
                      >
                        <RotateCw size={13} /> Rotate Right
                      </button>
                      <button
                        onClick={() => rotateAll(-90)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', padding: '10px' }}
                      >
                        <RotateCcw size={13} /> Rotate Left
                      </button>
                    </div>
                  </div>

                  {processing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Applying changes...</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{progressText}</p>
                      <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.1s' }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runRotate}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Apply Page Rotations
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                    <Check size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    Successfully Rotated!
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownload}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Download size={18} /> Download Rotated PDF
                    </button>
                    {downloadableBlob && (
                      <SecureShareButton 
                        file={downloadableBlob} 
                        fileName={`${basename(file.name)}-rotated.pdf`} 
                      />
                    )}
                  </div>
                  <ContinueWithBlob
                    sourceToolId="rotate-pdf"
                    blob={downloadableBlob}
                    fileName={`${basename(file.name)}-rotated.pdf`}
                    mimeType="application/pdf"
                    disabled={processing || !downloadableBlob}
                  />

                  <button
                    className="btn btn-ghost"
                    onClick={() => setDownloadableBlob(null)}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  >
                    Adjust Page Layouts
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium Metadata-Level Lossless PDF Page Rotator</h2>
          <p className="tool-description-para">
            Perfectly adjust landscape scans, upside-down pages, or tilted reports. 
            Because this tool communicates directly with PDF layout boundaries and writes raw metadata using pdf-lib, text styling and embedded graphic files remain intact.
          </p>
          <p className="tool-description-para-last">
            ✓ True lossless page rotations · ✓ Fast local rendering architecture · ✓ Secure bank-level privacy.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload PDF Document', 'Drop your files securely inside the browser dashboard.'],
          ['Rotate Specific Pages', 'Click on individual pages or use the batch rotate actions.'],
          ['Download Rotated PDF', 'Export the corrected document instantly with zero compression loss.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Utilities</h3>
          <div className="related-tools-links">
            <a href="/split-pdf" className="btn btn-secondary btn-related">Split PDF</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
            <a href="/crop-pdf" className="btn btn-secondary btn-related">Crop PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
