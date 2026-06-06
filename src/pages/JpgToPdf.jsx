import { useState, useEffect, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { FileImage, ArrowLeft, Shield, Columns, Layout, Download, ArrowLeftCircle, ArrowRightCircle, Trash2, Sliders, Check } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { imagesToPdf } from '../utils/pdfUtils'
import { downloadBlob, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'Can I combine multiple JPG files into a single PDF?', a: 'Yes. You can upload dozens of JPG files at once, easily rearrange their page sequence, and compile them into a single high-quality PDF document.' },
  { q: 'Is there a file size limit or a page count limit?', a: 'No. Fileora operates 100% inside your browser, meaning there are no server-imposed file limits or page restrictions. You can convert large documents safely.' },
  { q: 'Will the image quality drop after converting to PDF?', a: 'No. Our converter embeds JPG files natively inside the PDF structure with perfect resolution, preserving the original detail and clarity.' },
  { q: 'Can I choose different page dimensions or margins?', a: 'Yes. Fileora provides presets for A4, US Letter, or "Fit Image" (which sets each PDF page to match the exact size of your input image), plus options for margins and orientation.' }
]

export default function JpgToPdf() {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState('a4') // 'a4', 'letter', 'fit'
  const [orientation, setOrientation] = useState('portrait') // 'portrait', 'landscape'
  const [margin, setMargin] = useState(0) // 0, 20, 40
  const [processing, setProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)

  const onHandoffFile = useCallback((file) => { setFiles([file]); setError('') }, [])
  const onHandoffFiles = useCallback((nextFiles) => { setFiles(nextFiles); setError('') }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('jpg-to-pdf', { onFile: onHandoffFile, onFiles: onHandoffFiles })

  const runConvert = async () => {
    if (!files.length) return
    setProcessing(true)
    setError('')
    try {
      // Small timeout to give DOM time to update spinner
      await new Promise((r) => setTimeout(r, 600))
      
      const fileObjects = files.map(f => f.file)
      const blob = await imagesToPdf(fileObjects, { pageSize, orientation, margin })
      
      if (resultUrl) URL.revokeObjectURL(resultUrl)
      
      setResultBlob(blob)
      setResultUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error(err)
      setError('Failed to convert images to PDF. Please try a different JPG file.')
    } finally {
      setProcessing(false)
    }
  }

  // Auto run conversion whenever settings or files list changes
  useEffect(() => {
    if (files.length > 0) {
      runConvert()
    } else {
      setResultBlob(null)
      if (resultUrl) URL.revokeObjectURL(resultUrl)
      setResultUrl(null)
    }
  }, [files, pageSize, orientation, margin])

  const handleDownload = () => {
    if (!resultBlob) return
    const name = files[0].file.name.replace(/\.[^/.]+$/, '')
    downloadBlob(resultBlob, `${name}-converted.pdf`)
  }

  const handleReset = () => {
    setFiles([])
    setResultBlob(null)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setResultUrl(null)
    setError('')
  }

  // Interactive Reordering Functions
  const moveItem = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= files.length) return
    
    const newFiles = [...files]
    const temp = newFiles[index]
    newFiles[index] = newFiles[nextIndex]
    newFiles[nextIndex] = temp
    setFiles(newFiles)
  }

  const removeItem = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora JPG to PDF Converter',
    url: 'https://fileora.tech/jpg-to-pdf',
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
        <title>Convert JPG to PDF Online - Free & Private | Fileora</title>
        <meta name="description" content="Convert JPG images to PDF online for free. Arrange pages in custom order, adjust page size, orientation, and margins. Safe, local client-side compilation." />
        <link rel="canonical" href="https://fileora.tech/jpg-to-pdf" data-rh="true" />
        <meta property="og:title" content="Convert JPG to PDF Online - Free & Private | Fileora" />
        <meta property="og:description" content="Convert JPG images to PDF online for free. Arrange pages in custom order, adjust page size, orientation, and margins. Safe, local client-side compilation." />
        <meta property="og:url" content="https://fileora.tech/jpg-to-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Convert JPG to PDF Online - Free & Private | Fileora" />
        <meta name="twitter:description" content="Convert JPG images to PDF online for free. Arrange pages in custom order, adjust page size, orientation, and margins. Safe, local client-side compilation." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Convert JPG to PDF Online</h1>
          <p>Easily convert JPG, JPEG, and WebP images to a clean PDF in seconds. Reorder pages, customize layouts, and export securely.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {files.length === 0 ? (
          <div className="container container-narrow">
            <DropZone
              accept="image/jpeg,image/jpg"
              multiple={true}
              maxSizeLabel="50MB"
              helpText="Select JPG image files to convert"
              error={error}
              onFiles={(nextFiles) => {
                const accepted = nextFiles.filter(
                  (next) => next.type === 'image/jpeg' || next.type === 'image/jpg' || next.name.toLowerCase().endsWith('.jpg') || next.name.toLowerCase().endsWith('.jpeg')
                )
                if (!accepted.length) {
                  setError('Please select valid JPG or JPEG files.')
                  return
                }
                
                // Read thumbs for queue list
                const mapped = accepted.map((file) => ({
                  file,
                  thumb: URL.createObjectURL(file)
                }))
                setFiles(mapped)
              }}
            />
          </div>
        ) : (
          <section className="workspace-panel">
            {/* Left side preview */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '450px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {processing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', color: 'var(--text-secondary)' }}>
                  <div className="loading-spinner"></div>
                  <span>Generating layouts and compiling PDF...</span>
                </div>
              ) : resultUrl ? (
                <iframe
                  src={resultUrl + '#toolbar=0'}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)' }}>
                  Queue initialized. Compiling...
                </div>
              )}
            </div>

            {/* Right side controls panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Local compiler</div>
              </div>

              {/* Arrange pages queue */}
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arrange Pages ({files.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {files.map((item, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        background: 'var(--bg-primary)', 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)' 
                      }}
                    >
                      <img 
                        src={item.thumb} 
                        alt="Thumbnail" 
                        style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                      <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {index + 1}. {item.file.name}
                      </span>
                      
                      {/* Move keys */}
                      <button 
                        onClick={() => moveItem(index, -1)} 
                        disabled={index === 0} 
                        style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: index === 0 ? 0.3 : 1 }}
                      >
                        <ArrowLeftCircle size={15} />
                      </button>
                      <button 
                        onClick={() => moveItem(index, 1)} 
                        disabled={index === files.length - 1} 
                        style={{ background: 'none', border: 'none', cursor: index === files.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: index === files.length - 1 ? 0.3 : 1 }}
                      >
                        <ArrowRightCircle size={15} />
                      </button>
                      <button 
                        onClick={() => removeItem(index)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout controls */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Page Size Preset</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'a4', label: 'A4 Paper' },
                    { id: 'letter', label: 'US Letter' },
                    { id: 'fit', label: 'Fit Image' }
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
                        transition: 'all 0.2s',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {pageSize !== 'fit' && (
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
                        gap: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <Columns size={13} /> Portrait
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
                        gap: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <Layout size={13} /> Landscape
                    </button>
                  </div>
                </div>
              )}

              {/* Margins */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Margins</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 0, label: 'None' },
                    { id: 20, label: 'Small' },
                    { id: 40, label: 'Large' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setMargin(preset.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        backgroundColor: margin === preset.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        border: `2px solid ${margin === preset.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="error-message">{error}</p>}

              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                <button
                  className="btn btn-primary btn-gradient"
                  onClick={handleDownload}
                  disabled={processing || !resultBlob}
                  style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                >
                  <Download size={18} /> Download Compiled PDF
                </button>
                {resultBlob && (
                  <SecureShareButton 
                    file={resultBlob} 
                    fileName={`${files.length > 0 ? files[0].file.name.replace(/\.[^/.]+$/, '') : 'document'}-converted.pdf`} 
                  />
                )}
              </div>
              <ContinueWithBlob
                sourceToolId="jpg-to-pdf"
                blob={resultBlob}
                fileName={files.length > 0 ? `${basename(files[0].file.name)}-converted.pdf` : 'converted.pdf'}
                mimeType="application/pdf"
                disabled={processing || !resultBlob}
              />
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium, Dedicated, High-Quality JPG to PDF Compiler</h2>
          <p className="tool-description-para">
            Perfectly combine JPEG photographs, scans, and documents into neat, beautifully aligned PDF collections. 
            Adjust layouts, switch page presets, and define custom outer margins on the fly without waiting for remote server upload queues.
          </p>
          <p className="tool-description-para-last">
            ✓ Adjust margin offsets · ✓ Re-order slides dynamically · ✓ Lossless image canvas embedding.
          </p>
        </section>

        <HowItWorks steps={[
          ['Select JPG Photos', 'Drag and drop standard JPG files instantly.'],
          ['Organize Page Order', 'Easily rearrange sequence priority and customize margins.'],
          ['Generate and Save PDF', 'Compile instantly in lossless high fidelity. No servers involved.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/image-to-pdf" className="btn btn-secondary btn-related">Image to PDF</a>
            <a href="/png-to-pdf" className="btn btn-secondary btn-related">PNG to PDF</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
