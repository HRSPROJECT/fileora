import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Crop, ArrowLeft, Shield, Sliders, Download } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob, formatBytes } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'How does PDF page cropping work?', a: 'We adjust the structural "CropBox" boundaries in your PDF document. This visually crops out margins without deleting the original page streams.' },
  { q: 'Can I crop individual margins independently?', a: 'Yes. You can configure Left, Right, Top, and Bottom margins independently using precision percentages in our control panel.' },
  { q: 'Is my document quality compromised?', a: 'No. Since this adjusts structural metadata rather than re-rendering graphics, text vectors and visuals remain 100% original quality.' },
]

export default function CropPdf() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)
  
  // Crop values in percentage (0 - 30%)
  const [leftCrop, setLeftCrop] = useState(5)
  const [rightCrop, setRightCrop] = useState(5)
  const [topCrop, setTopCrop] = useState(5)
  const [bottomCrop, setBottomCrop] = useState(5)

  const [processing, setProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)

  useEffect(() => {
    if (!file) return
    const readInfo = async () => {
      try {
        const bytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        setPageCount(doc.getPageCount())
      } catch (err) {
        setError('Could not open PDF file. Verify that it is not protected.')
      }
    }
    readInfo()
  }, [file])

  const runCrop = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      await new Promise((r) => setTimeout(r, 1000))
      const bytes = await file.arrayBuffer()
      const source = await PDFDocument.load(bytes)
      const newDoc = await PDFDocument.create()

      const copiedPages = await newDoc.copyPages(source, source.getPageIndices())
      copiedPages.forEach((page) => {
        const { width, height } = page.getSize()
        
        // Calculate crop bounds in points
        const cropX = (leftCrop / 100) * width
        const cropY = (bottomCrop / 100) * height
        const cropW = width - ((leftCrop + rightCrop) / 100) * width
        const cropH = height - ((topCrop + bottomCrop) / 100) * height

        // Set the CropBox boundary coordinates
        page.setCropBox(cropX, cropY, cropW, cropH)
        
        newDoc.addPage(page)
      })

      const outputBytes = await newDoc.save()
      const blob = new Blob([outputBytes], { type: 'application/pdf' })
      setResultBlob(blob)
    } catch (err) {
      setError('Failed to crop page margins. Please verify formatting.')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (file) {
      runCrop()
    }
  }, [file, leftCrop, rightCrop, topCrop, bottomCrop])

  const handleDownload = () => {
    if (!resultBlob) return
    const name = file.name.replace(/\.pdf$/i, '')
    downloadBlob(resultBlob, `${name}-cropped.pdf`)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Cropper',
    url: 'https://fileora.tech/crop-pdf',
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
        <title>Free PDF Cropper Online — Crop PDF Pages | Fileora</title>
        <meta name="description" content="Crop PDF pages online for free. Remove margins, crop to custom size. Browser-based, no signup." />
        <link rel="canonical" href="https://fileora.tech/crop-pdf" data-rh="true" />
        <meta property="og:title" content="Free PDF Cropper Online — Crop PDF Pages | Fileora" />
        <meta property="og:description" content="Crop PDF pages online for free. Remove margins, crop to custom size. Browser-based, no signup." />
        <meta property="og:url" content="https://fileora.tech/crop-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free PDF Cropper Online — Crop PDF Pages | Fileora" />
        <meta name="twitter:description" content="Crop PDF pages online for free. Remove margins, crop to custom size. Browser-based, no signup." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Online PDF Cropper</h1>
          <p>Trim white space margins, crop columns, and customize visible dimensions. 100% locally compiled.</p>
        </section>

        {!file ? (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF file to crop margins"
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
                  <span>Recalculating CropBox bounding coordinates...</span>
                </div>
              ) : resultBlob ? (
                <iframe
                  src={URL.createObjectURL(resultBlob) + '#toolbar=0'}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
                />
              ) : (
                <div className="tool-description-para-last">Select edge percentages to crop.</div>
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

              {/* Edge Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Sliders size={14} /> Edge Crop Settings
                </div>

                {/* Top Crop */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span className="tool-description-para-last">Top Margin</span>
                    <span style={{ fontWeight: 600 }}>{topCrop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={topCrop}
                    onChange={(e) => setTopCrop(parseInt(e.target.value))}
                    className="slider"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Bottom Crop */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span className="tool-description-para-last">Bottom Margin</span>
                    <span style={{ fontWeight: 600 }}>{bottomCrop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={bottomCrop}
                    onChange={(e) => setBottomCrop(parseInt(e.target.value))}
                    className="slider"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Left Crop */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span className="tool-description-para-last">Left Margin</span>
                    <span style={{ fontWeight: 600 }}>{leftCrop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={leftCrop}
                    onChange={(e) => setLeftCrop(parseInt(e.target.value))}
                    className="slider"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Right Crop */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span className="tool-description-para-last">Right Margin</span>
                    <span style={{ fontWeight: 600 }}>{rightCrop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={rightCrop}
                    onChange={(e) => setRightCrop(parseInt(e.target.value))}
                    className="slider"
                    style={{ width: '100%' }}
                  />
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
                  <Download size={18} /> Download Cropped PDF
                </button>
                {resultBlob && (
                  <SecureShareButton 
                    file={resultBlob} 
                    fileName={`${file ? file.name.replace(/\.pdf$/i, '') : 'document'}-cropped.pdf`} 
                  />
                )}
              </div>
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Crop Margins with Zero Structural Distortion</h2>
          <p className="tool-description-para">
            Ideal for cropping scanning borders, excessive white space, margins, or tailoring printable page zones. 
            Because this tool operates natively on structural parameters, the inner text vectors remain crisp and scalable.
          </p>
          <p className="tool-description-para-last">
            ✓ Clean margin boundary resizing · ✓ Independent edge margin percentage adjustments · ✓ Rapid client-side compile times.
          </p>
        </section>

        <HowItWorks steps={[
          ['Add PDF File', 'Upload a PDF document up to 100MB.'],
          ['Adjust Crop Box Margins', 'Refine Top, Bottom, Left, and Right margin sliders visually.'],
          ['Save Trimmed Output', 'Instantly export the cropped PDF directly to your device.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/resize-pdf" className="btn btn-secondary btn-related">Resize PDF</a>
            <a href="/compress-pdf" className="btn btn-secondary btn-related">PDF Compressor</a>
            <a href="/split-pdf" className="btn btn-secondary btn-related">Split PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
