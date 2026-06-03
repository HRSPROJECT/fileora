import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Hash, ArrowLeft, Shield, Download, Sparkles, Sliders, Check } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const faqs = [
  { q: 'Can I add page numbers starting from a number other than 1?', a: 'Yes. You can customize the starting page number in the control sidebar. For example, you can set it to start numbering from 5 or 10.' },
  { q: 'Can I exclude the first page (cover sheet) from page numbers?', a: 'Yes. Fileora provides a premium option to exclude the first page from numbering, which is the standard industry practice for documents with a title or cover sheet.' },
  { q: 'Where can I position the page numbers on the document?', a: 'You can choose between 6 standard placements: Top Left, Top Center, Top Right, Bottom Left, Bottom Center, or Bottom Right.' },
  { q: 'Are my private files sent to any servers?', a: 'Never. Like all other Fileora utilities, the page numbering occurs completely inside your local browser memory space using pdf-lib. Your documents remain private.' }
]

export default function NumberPdf() {
  const [file, setFile] = useState(null)
  const [pdfDocJS, setPdfDocJS] = useState(null)
  const [previewPageUrl, setPreviewPageUrl] = useState('')
  const [pageWidth, setPageWidth] = useState(612)
  const [pageHeight, setPageHeight] = useState(792)
  const [totalPages, setTotalPages] = useState(0)

  // Side settings
  const [position, setPosition] = useState('bottom-center') // 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'
  const [format, setFormat] = useState('page-x') // 'page-x', 'x-of-y', 'x', 'slash'
  const [startNum, setStartNum] = useState(1)
  const [excludeFirst, setExcludeFirst] = useState(false)
  const [fontSize, setFontSize] = useState(11)
  const [textColor, setTextColor] = useState('#4B5563') // dark gray

  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [downloadableBlob, setDownloadableBlob] = useState(null)

  const handleFile = async (selectedFile) => {
    setError('')
    setFile(selectedFile)
    setPdfDocJS(null)
    setPreviewPageUrl('')
    setDownloadableBlob(null)
    setProcessing(true)
    setProgressText('Loading PDF page blueprints...')

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      setPdfDocJS(pdf)
      setTotalPages(pdf.numPages)

      // Render page 1 (or 2 if page 1 is excluded)
      const pageToRender = (excludeFirst && pdf.numPages > 1) ? 2 : 1
      const page = await pdf.getPage(pageToRender)
      const viewport = page.getViewport({ scale: 1.0 })
      setPageWidth(viewport.width)
      setPageHeight(viewport.height)

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: context, viewport }).promise
      setPreviewPageUrl(canvas.toDataURL('image/jpeg', 0.8))
    } catch (err) {
      console.error(err)
      setError('Could not open the PDF file. It may be locked or corrupted.')
      setFile(null)
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  // Monitor cover page exclusions and swap preview page
  useEffect(() => {
    if (file && pdfDocJS) {
      const swapPreview = async () => {
        try {
          const pageToRender = (excludeFirst && totalPages > 1) ? 2 : 1
          const page = await pdfDocJS.getPage(pageToRender)
          const viewport = page.getViewport({ scale: 1.0 })
          
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height

          await page.render({ canvasContext: context, viewport }).promise
          setPreviewPageUrl(canvas.toDataURL('image/jpeg', 0.8))
        } catch (err) {
          console.error(err)
        }
      }
      swapPreview()
    }
  }, [excludeFirst, file])

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0.3, g: 0.3, b: 0.3 }
  }

  const runNumbering = async () => {
    if (!file) return
    setProcessing(true)
    setProgressText('Numbering PDF index lines...')
    setError('')

    try {
      await new Promise((r) => setTimeout(r, 600))
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const total = pages.length

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const rgbColor = hexToRgb(textColor)

      pages.forEach((page, index) => {
        const pageNum = index + startNum
        if (excludeFirst && index === 0) return

        let label = ''
        if (format === 'page-x') label = `Page ${pageNum}`
        else if (format === 'x-of-y') label = `Page ${pageNum} of ${total}`
        else if (format === 'x') label = `${pageNum}`
        else if (format === 'slash') label = `${pageNum} / ${total}`

        const pWidth = page.getWidth()
        const pHeight = page.getHeight()
        const textWidth = helveticaFont.widthOfTextAtSize(label, fontSize)
        const textHeight = fontSize * 0.8

        let x = pWidth / 2 - textWidth / 2
        let y = 30 // bottom default

        if (position === 'top-left') {
          x = 40
          y = pHeight - 40
        } else if (position === 'top-center') {
          x = pWidth / 2 - textWidth / 2
          y = pHeight - 40
        } else if (position === 'top-right') {
          x = pWidth - textWidth - 40
          y = pHeight - 40
        } else if (position === 'bottom-left') {
          x = 40
          y = 30
        } else if (position === 'bottom-center') {
          x = pWidth / 2 - textWidth / 2
          y = 30
        } else if (position === 'bottom-right') {
          x = pWidth - textWidth - 40
          y = 30
        }

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font: helveticaFont,
          color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
          zIndex: 100
        })
      })

      const bytes = await pdfDoc.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      setDownloadableBlob(blob)
    } catch (err) {
      console.error(err)
      setError('Failed to apply page numbering. Please try a different file.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const handleDownload = () => {
    if (!downloadableBlob) return
    downloadBlob(downloadableBlob, `${basename(file.name)}-numbered.pdf`)
  }

  const handleReset = () => {
    setFile(null)
    setPdfDocJS(null)
    setPreviewPageUrl('')
    setDownloadableBlob(null)
    setTotalPages(0)
    setError('')
  }

  const getPreviewText = () => {
    const total = totalPages || 12
    const num = excludeFirst ? startNum + 1 : startNum
    if (format === 'page-x') return `Page ${num}`
    if (format === 'x-of-y') return `Page ${num} of ${total}`
    if (format === 'x') return `${num}`
    if (format === 'slash') return `${num} / ${total}`
    return `Page ${num}`
  }

  const getPreviewOverlayStyle = () => {
    let styles = {
      position: 'absolute',
      color: textColor,
      fontSize: `${fontSize * 0.8}px`,
      fontWeight: 500,
      fontFamily: 'Helvetica, Arial, sans-serif',
      pointerEvents: 'none',
      zIndex: 50,
      userSelect: 'none'
    }

    if (position === 'top-left') {
      styles = { ...styles, top: '24px', left: '24px' }
    } else if (position === 'top-center') {
      styles = { ...styles, top: '24px', left: '50%', transform: 'translateX(-50%)' }
    } else if (position === 'top-right') {
      styles = { ...styles, top: '24px', right: '24px' }
    } else if (position === 'bottom-left') {
      styles = { ...styles, bottom: '24px', left: '24px' }
    } else if (position === 'bottom-center') {
      styles = { ...styles, bottom: '24px', left: '50%', transform: 'translateX(-50%)' }
    } else if (position === 'bottom-right') {
      styles = { ...styles, bottom: '24px', right: '24px' }
    }

    return styles
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Page Numberer',
    url: 'https://fileora.tech/number-pdf',
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
        <title>Add Page Numbers to PDF Online - Free & Private | Fileora</title>
        <meta name="description" content="Add page numbers to PDF files online for free. Exclude cover sheet, start from any page, customize numbering formats, placement coordinates, sizing, and colors." />
        <link rel="canonical" href="https://fileora.tech/number-pdf" data-rh="true" />
        <meta property="og:title" content="Add Page Numbers to PDF Online - Free & Private | Fileora" />
        <meta property="og:description" content="Add page numbers to PDF files online for free. Exclude cover sheet, start from any page, customize numbering formats, placement coordinates, sizing, and colors." />
        <meta property="og:url" content="https://fileora.tech/number-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Add Page Numbers to PDF Online - Free & Private | Fileora" />
        <meta name="twitter:description" content="Add page numbers to PDF files online for free. Exclude cover sheet, start from any page, customize numbering formats, placement coordinates, sizing, and colors." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Add Page Numbers to PDF</h1>
          <p>Organize document hierarchies. Set custom sizes, color palettes, spacing, formats, cover-page skips, and placement presets locally.</p>
        </section>

        {processing && progressText && !previewPageUrl && (
          <div className="container" style={{ maxWidth: '640px', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div className="loading-spinner" />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{progressText}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compiling PDF client-side nodes...</span>
          </div>
        )}

        {!file && !processing && (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="80MB"
              helpText="Select a PDF file to add page numbering"
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

        {file && previewPageUrl && (
          <section className="workspace-panel">
            {/* Left side preview */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '480px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Numbering Blueprint Preview {excludeFirst && totalPages > 1 ? '(Page 2 Preview)' : '(Page 1 Preview)'}
                </span>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'auto' }}>
                {downloadableBlob ? (
                  <iframe
                    src={URL.createObjectURL(downloadableBlob) + '#toolbar=0'}
                    title="PDF Preview"
                    style={{ width: '100%', height: '100%', minHeight: '400px', border: 'none', borderRadius: '4px' }}
                  />
                ) : (
                  <div style={{ position: 'relative', width: '100%', maxWidth: '360px', height: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {/* Rendered page */}
                    <img 
                      src={previewPageUrl} 
                      alt="Background Preview" 
                      style={{ width: '100%', display: 'block' }} 
                    />

                    {/* Watermark layer overlay */}
                    <div style={getPreviewOverlayStyle()}>
                      {getPreviewText()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side settings panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '720px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Client-Side</div>
              </div>

              <div>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Numbering Formats</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pages: {totalPages}</p>
              </div>

              {!downloadableBlob ? (
                <>
                  {/* Select number formats */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Number Format</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'page-x', label: 'Page X' },
                        { id: 'x-of-y', label: 'Page X of Y' },
                        { id: 'x', label: 'X (Number Only)' },
                        { id: 'slash', label: 'X / Y' }
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setFormat(fmt.id)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '6px',
                            backgroundColor: format === fmt.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                            border: `1.5px solid ${format === fmt.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Positioning presets */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Number Placement</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'top-left', label: 'Top Left' },
                        { id: 'top-center', label: 'Top Mid' },
                        { id: 'top-right', label: 'Top Right' },
                        { id: 'bottom-left', label: 'Bottom L' },
                        { id: 'bottom-center', label: 'Bottom M' },
                        { id: 'bottom-right', label: 'Bottom R' }
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => setPosition(pos.id)}
                          style={{
                            padding: '8px 2px',
                            borderRadius: '4px',
                            backgroundColor: position === pos.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                            border: `1.5px solid ${position === pos.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exclusions & start counts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="exclude-first" 
                        checked={excludeFirst} 
                        onChange={(e) => setExcludeFirst(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <label htmlFor="exclude-first" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                        Exclude numbering on first page
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Number</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={startNum} 
                          onChange={(e) => setStartNum(parseInt(e.target.value) || 1)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Font Size ({fontSize}px)</label>
                        <input 
                          type="range" 
                          min="8" 
                          max="24" 
                          value={fontSize} 
                          onChange={(e) => setFontSize(parseInt(e.target.value))}
                          className="slider"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Font Color</label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input 
                          type="color" 
                          value={textColor} 
                          onChange={(e) => setTextColor(e.target.value)}
                          style={{ width: '36px', height: '36px', border: 'none', padding: 0, background: 'none', cursor: 'pointer', borderRadius: '4px' }} 
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{textColor}</span>
                      </div>
                    </div>
                  </div>

                  {processing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>Stamping Page indices...</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runNumbering}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Add Page Numbers
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                    ✓ Page Numbers Added!
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownload}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Download size={18} /> Download Numbered PDF
                    </button>
                    {downloadableBlob && (
                      <SecureShareButton 
                        file={downloadableBlob} 
                        fileName={`${basename(file.name)}-numbered.pdf`} 
                      />
                    )}
                  </div>

                  <button
                    className="btn btn-ghost"
                    onClick={() => setDownloadableBlob(null)}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  >
                    Adjust Numbers / Reset
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium Lossless Vector Page Numbering for PDF Files</h2>
          <p className="tool-description-para">
            Perfectly compile standard indexes, pagination, and visual labels onto business reports, legal filings, and school notes. 
            Because Fileora edits raw coordinates directly on PDF layers, page indexes remain extremely clear on high-resolution print margins.
          </p>
          <p className="tool-description-para-last">
            ✓ Exclude cover page skips · ✓ 6 positioning presets · ✓ Crisp local javascript execution.
          </p>
        </section>

        <HowItWorks steps={[
          ['Select PDF File', 'Upload your document file securely up to 80MB.'],
          ['Customize Numbers', 'Configure placement coordinates, format presets, sizes, colors, and range exclusions.'],
          ['Instant PDF Download', 'Apply pagination losslessly in client-side space inside seconds.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/rotate-pdf" className="btn btn-secondary btn-related">Rotate PDF</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
            <a href="/split-pdf" className="btn btn-secondary btn-related">Split PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
