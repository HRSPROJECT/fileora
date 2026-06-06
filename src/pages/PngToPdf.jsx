import { useState, useEffect, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { FileImage, ArrowLeft, Shield, Columns, Layout, Download } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { imagesToPdf } from '../utils/pdfUtils'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'Can I convert multiple PNGs to a single PDF?', a: 'Yes. Upload all your PNG files and we will compile them into one PDF in your chosen page order.' },
  { q: 'Will the PNG image quality degrade?', a: 'No. The image resolution is fully maintained. PNGs are embedded natively as lossless elements in the PDF container.' },
  { q: 'Is there a file limit size?', a: 'No. Fileora supports bulk uploads of PNGs up to 50MB per file.' },
]

export default function PngToPdf() {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState('a4') // 'a4', 'letter', 'fit'
  const [orientation, setOrientation] = useState('portrait') // 'portrait', 'landscape'
  const [margin, setMargin] = useState(0) // 0, 10, 20
  const [processing, setProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)

  const onHandoffFile = useCallback((file) => { setFiles([file]); setError('') }, [])
  const onHandoffFiles = useCallback((nextFiles) => { setFiles(nextFiles); setError('') }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('png-to-pdf', { onFile: onHandoffFile, onFiles: onHandoffFiles })

  const runConvert = async () => {
    if (!files.length) return
    setProcessing(true)
    setError('')
    try {
      await new Promise((r) => setTimeout(r, 1000))
      const blob = await imagesToPdf(files, { pageSize, orientation, margin })
      setResultBlob(blob)
    } catch (err) {
      setError('Failed to convert PNG images to PDF. Try verifying formatting.')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (files.length > 0) {
      runConvert()
    }
  }, [files, pageSize, orientation, margin])

  const handleDownload = () => {
    if (!resultBlob) return
    const name = files[0].name.replace(/\.[^/.]+$/, '')
    downloadBlob(resultBlob, `${name}-png-to-pdf.pdf`)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PNG to PDF Converter',
    url: 'https://fileora.tech/png-to-pdf',
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
        <title>Free PNG to PDF Converter Online | Fileora</title>
        <meta name="description" content="Convert PNG images to PDF online for free. Also supports JPG, WebP, AVIF. Combine multiple images into one PDF. Browser-based, no signup." />
        <link rel="canonical" href="https://fileora.tech/png-to-pdf" data-rh="true" />
        <meta property="og:title" content="Free PNG to PDF Converter Online | Fileora" />
        <meta property="og:description" content="Convert PNG images to PDF online for free. Also supports JPG, WebP, AVIF. Combine multiple images into one PDF. Browser-based, no signup." />
        <meta property="og:url" content="https://fileora.tech/png-to-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free PNG to PDF Converter Online | Fileora" />
        <meta name="twitter:description" content="Convert PNG images to PDF online for free. Also supports JPG, WebP, AVIF. Combine multiple images into one PDF. Browser-based, no signup." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Online PNG to PDF Converter</h1>
          <p>Convert PNG images to A4, Letter, or original sized PDF instantly. 100% locally compiled in your browser.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {files.length === 0 ? (
          <div className="container container-narrow">
            <DropZone
              accept="image/png"
              multiple={true}
              maxSizeLabel="50MB"
              helpText="Select PNG image files to convert"
              error={error}
              onFiles={(nextFiles) => {
                const accepted = nextFiles.filter((next) => next.type === 'image/png')
                if (!accepted.length) {
                  setError('Please select valid PNG image files.')
                  return
                }
                setFiles(accepted)
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
                  <span>Generating PDF with lossless image embedding...</span>
                </div>
              ) : resultBlob ? (
                <iframe
                  src={URL.createObjectURL(resultBlob) + '#toolbar=0'}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
                />
              ) : (
                <div className="tool-description-para-last">Uploading complete. Generating layout.</div>
              )}
            </div>

            {/* Right side controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setFiles([])} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Local</div>
              </div>

              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>PNG Queue ({files.length} files)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxHeight: '100px', overflowY: 'auto' }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      · {f.name} ({formatBytes(f.size)})
                    </div>
                  ))}
                </div>
              </div>

              {/* PDF Page Format Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Page Layout Format</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'a4', label: 'A4 Preset' },
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
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation toggle */}
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
              )}

              {/* Margins */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Page Margins</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 0, label: 'No Margin' },
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
                        fontSize: '12px',
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
                  style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px' }}
                >
                  <Download size={18} /> Download Generated PDF
                </button>
                {resultBlob && (
                  <SecureShareButton 
                    file={resultBlob} 
                    fileName={`${files.length > 0 ? files[0].name.replace(/\.[^/.]+$/, '') : 'document'}-png-to-pdf.pdf`} 
                  />
                )}
              </div>
              <ContinueWithBlob
                sourceToolId="png-to-pdf"
                blob={resultBlob}
                fileName={files.length > 0 ? `${basename(files[0].name)}-png-to-pdf.pdf` : 'png-to-pdf.pdf'}
                mimeType="application/pdf"
                restoreFiles={files}
                disabled={processing || !resultBlob}
              />
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Lossless, Dedicated PNG to PDF Converter</h2>
          <p className="tool-description-para">
            Combine high-res transparent PNG captures, screenshots, certificates, and signature files into unified PDF collections. 
            Because we stream raw file structures rather than compressing graphics, all raster vectors stay perfectly readable.
          </p>
          <p className="tool-description-para-last">
            ✓ Preserve transparency structures · ✓ Fluid drag and drop bulk processing · ✓ Safe for enterprise bank forms.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload PNG Images', 'Add one or more PNG files up to 50MB.'],
          ['Customize PDF Layout', 'Tailor page format, orientation, and margin offsets.'],
          ['Save Compiled PDF', 'Instantly compile and download your document securely.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/image-to-pdf" className="btn btn-secondary btn-related">Image to PDF</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
            <a href="/compress-pdf" className="btn btn-secondary btn-related">PDF Compressor</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
