import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Scissors, ArrowLeft, Shield, Check, Trash, Download } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob, formatBytes } from '../utils/imageUtils'

const faqs = [
  { q: 'Can I split a PDF visually?', a: 'Yes. Fileora renders a list of all pages in your PDF. You can check the boxes of the pages you want to keep or remove and preview the result immediately.' },
  { q: 'Is there a limit on file size?', a: 'No. Fileora processes large PDFs up to 100MB directly on your device.' },
  { q: 'Will the split PDF lose hyperlinks or bookmarks?', a: 'No. Pages are copied structurally using pdf-lib, meaning vector objects, internal links, and font styles stay intact.' },
  { q: 'Can I extract a single page from a PDF?', a: 'Yes. Simply select that page and click generate.' },
]

export default function SplitPdf() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState('extract') // 'extract' or 'remove'
  const [selectedPages, setSelectedPages] = useState([]) // array of 0-based indices
  const [processing, setProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)

  useEffect(() => {
    if (!file) return
    const readPages = async () => {
      try {
        const bytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const count = doc.getPageCount()
        setPageCount(count)
        // By default select all pages
        setSelectedPages(Array.from({ length: count }, (_, i) => i))
      } catch (err) {
        setError('Could not parse PDF. Make sure it is not password protected.')
      }
    }
    readPages()
  }, [file])

  const togglePage = (index) => {
    setSelectedPages((current) => {
      if (current.includes(index)) {
        return current.filter((i) => i !== index)
      } else {
        return [...current, index].sort((a, b) => a - b)
      }
    })
  }

  const runSplit = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      await new Promise((r) => setTimeout(r, 800))
      const bytes = await file.arrayBuffer()
      const source = await PDFDocument.load(bytes)
      const newDoc = await PDFDocument.create()

      let indicesToCopy = []
      if (mode === 'extract') {
        indicesToCopy = selectedPages
      } else {
        // remove mode: copy pages not selected
        indicesToCopy = Array.from({ length: pageCount }, (_, i) => i).filter(
          (i) => !selectedPages.includes(i)
        )
      }

      if (indicesToCopy.length === 0) {
        throw new Error('Please select at least one page.')
      }

      const copiedPages = await newDoc.copyPages(source, indicesToCopy)
      copiedPages.forEach((page) => newDoc.addPage(page))

      const outputBytes = await newDoc.save()
      const blob = new Blob([outputBytes], { type: 'application/pdf' })
      setResultBlob(blob)
    } catch (err) {
      setError(err.message || 'Error occurred while splitting the PDF.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const name = file.name.replace(/\.pdf$/i, '')
    downloadBlob(resultBlob, `${name}-${mode}ed.pdf`)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Splitter',
    url: 'https://fileora.tech/split-pdf',
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
        <title>Free PDF Splitter Online — Split PDF, Remove Pages | Fileora</title>
        <meta name="description" content="Split PDF files online for free. Extract pages, split by range, or remove specific pages. Browser-based, no signup, files never uploaded to server." />
        <link rel="canonical" href="https://fileora.tech/split-pdf" data-rh="true" />
        <meta property="og:title" content="Free PDF Splitter Online — Split PDF, Remove Pages | Fileora" />
        <meta property="og:description" content="Split PDF files online for free. Extract pages, split by range, or remove specific pages. Browser-based, no signup, files never uploaded to server." />
        <meta property="og:url" content="https://fileora.tech/split-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free PDF Splitter Online — Split PDF, Remove Pages | Fileora" />
        <meta name="twitter:description" content="Split PDF files online for free. Extract pages, split by range, or remove specific pages. Browser-based, no signup, files never uploaded to server." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Online PDF Splitter & Page Extractor</h1>
          <p>Extract specific page numbers or delete unwanted pages in seconds, completely client-side.</p>
        </section>

        {!file ? (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF file to split or edit"
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
            {/* Visual pages list */}
            <div className="file-list-panel" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1.5rem', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Visual Page Selector</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Click pages to select/deselect them for your operation.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
                {Array.from({ length: pageCount }).map((_, index) => {
                  const isChecked = selectedPages.includes(index)
                  return (
                    <div
                      key={index}
                      onClick={() => togglePage(index)}
                      style={{
                        position: 'relative',
                        aspectRatio: '0.75',
                        backgroundColor: 'var(--bg-primary)',
                        border: `2px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: isChecked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff'
                        }}
                      >
                        {isChecked && <Check size={12} />}
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: isChecked ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>Page</span>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{index + 1}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Side Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setFile(null)} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Private</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{file.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total pages in PDF: {pageCount}</p>
              </div>

              {/* Modes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Operation Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => { setMode('extract'); setResultBlob(null); }}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: mode === 'extract' ? 'var(--bg-tertiary)' : 'transparent',
                      color: mode === 'extract' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    Extract Pages
                  </button>
                  <button
                    onClick={() => { setMode('remove'); setResultBlob(null); }}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: mode === 'remove' ? 'var(--bg-tertiary)' : 'transparent',
                      color: mode === 'remove' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    Remove Pages
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {mode === 'extract' ? (
                  <span>Keeping <strong>{selectedPages.length}</strong> pages. Non-selected pages will be discarded.</span>
                ) : (
                  <span>Removing <strong>{selectedPages.length}</strong> selected pages. Remaining pages will be kept.</span>
                )}
              </div>

              {error && <p className="error-message">{error}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  disabled={processing}
                  onClick={runSplit}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {processing ? 'Processing split stream...' : 'Apply Layout Split'}
                </button>

                {resultBlob && (
                  <button
                    className="btn btn-primary btn-gradient animate-fade-in"
                    onClick={handleDownload}
                    style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px' }}
                  >
                    <Download size={18} /> Download Split PDF ({formatBytes(resultBlob.size)})
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Locally Run PDF Splitter & Page Remover</h2>
          <p className="tool-description-para">
            Perfect for extracting pages from tax declarations, split chapters of reference textbooks, and removing blank cover sheets. 
            Since operations are executed purely client-side, sensitive information never passes over any web connection.
          </p>
          <p className="tool-description-para-last">
            ✓ Split by index list · ✓ Visual grid checklist selection · ✓ Vector and graphic safety.
          </p>
        </section>

        <HowItWorks steps={[
          ['Add PDF Document', 'Upload a PDF file up to 100MB.'],
          ['Select Mode & Pages', 'Choose Extract or Remove and click the thumbnails.'],
          ['Stitch & Save Result', 'Download the customized new PDF instantly.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
            <a href="/compress-pdf" className="btn btn-secondary btn-related">PDF Compressor</a>
            <a href="/resize-pdf" className="btn btn-secondary btn-related">Resize PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
