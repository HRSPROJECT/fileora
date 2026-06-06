import { useState, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useShare } from '../context/ShareContext'
import { FileImage, ArrowLeft, Shield, Download, Sparkles, Layers, Settings, Eye, HelpCircle, Share2 } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import JSZip from 'jszip'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import * as pdfjsLib from 'pdfjs-dist'

// Configure pdfjs worker to use CDN matching the exact version
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const faqs = [
  { q: 'Is it safe to convert my PDF to images on Fileora?', a: 'Absolutely. The conversion is processed entirely in your web browser using HTML5 Canvas. Your PDF contents are never sent to any server, making the process completely secure and private.' },
  { q: 'Can I choose to convert only specific pages?', a: 'Yes. After uploading your PDF, you will see a thumbnail of every page. You can select specific pages or convert the entire document at once.' },
  { q: 'What resolution / DPI options are supported?', a: 'Fileora supports 72 DPI (Standard/Fast), 150 DPI (High-quality), and 300 DPI (Ultra/Print quality). This allows you to generate crisp images suitable for printing.' },
  { q: 'Which format should I choose: JPG or PNG?', a: 'Choose JPG for smaller file sizes (great for photographs and general scans). Choose PNG if you need transparent elements preserved or lossless quality for text-heavy documents.' }
]

export default function PdfToJpg() {
  const navigate = useNavigate()
  const { setFileToShare } = useShare()
  const [file, setFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [error, setError] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [thumbnails, setThumbnails] = useState([]) // array of dataUrls
  const [selectedPages, setSelectedPages] = useState([]) // array of 1-based page indices
  const [format, setFormat] = useState('jpg') // 'jpg', 'png'
  const [dpi, setDpi] = useState(150) // 72, 150, 300
  const [quality, setQuality] = useState(90) // for JPG quality
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [results, setResults] = useState([]) // array of { pageNum, blob, dataUrl }
  const [selectedPreview, setSelectedPreview] = useState(null) // dataUrl of page for lightbox view

  const handleFile = async (selectedFile) => {
    setError('')
    setFile(selectedFile)
    setPdfDoc(null)
    setThumbnails([])
    setSelectedPages([])
    setResults([])
    setProcessing(true)
    setProgressText('Loading PDF document structure...')
    setProgressPercent(10)

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      
      const pdf = await loadingTask.promise
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setSelectedPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1))
      setProgressText('Generating visual page maps...')
      
      // Load thumbnails for the first few pages instantly (up to 12 pages, to keep it snappy)
      const maxThumbnails = Math.min(pdf.numPages, 12)
      const thumbs = []
      
      for (let i = 1; i <= pdf.numPages; i++) {
        // We push placeholder or render asynchronously
        if (i <= maxThumbnails) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 0.25 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          await page.render({ canvasContext: context, viewport }).promise
          thumbs.push({ pageNum: i, dataUrl: canvas.toDataURL('image/jpeg', 0.6) })
        } else {
          // Placeholder for later pages
          thumbs.push({ pageNum: i, dataUrl: null })
        }
        setProgressPercent(Math.round(10 + (i / pdf.numPages) * 40))
      }
      
      setThumbnails(thumbs)
    } catch (err) {
      console.error(err)
      setError('Could not read or load the PDF file. It might be corrupted or password-protected.')
      setFile(null)
    } finally {
      setProcessing(false)
      setProgressPercent(0)
      setProgressText('')
    }
  }

  const onHandoffFile = useCallback((nextFile) => {
    handleFile(nextFile)
  }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('pdf-to-jpg', {
    onFile: onHandoffFile,
  })

  const runConvert = async () => {
    if (!pdfDoc || !selectedPages.length) return
    setProcessing(true)
    setError('')
    setProgressPercent(0)
    setResults([])

    const list = [...selectedPages].sort((a, b) => a - b)
    const converted = []

    try {
      const scaleFactor = dpi / 72 // pdf.js default is 72 dpi (1.0 scale)

      for (let index = 0; index < list.length; index++) {
        const pageNum = list[index]
        setProgressText(`Rendering page ${pageNum} at ${dpi} DPI...`)
        setProgressPercent(Math.round((index / list.length) * 100))

        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: scaleFactor })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        // White background fallback for JPEG
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({ canvasContext: context, viewport }).promise

        const mime = format === 'png' ? 'image/png' : 'image/jpeg'
        const q = format === 'png' ? 1.0 : quality / 100
        
        const blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), mime, q)
        })

        converted.push({
          pageNum,
          blob,
          dataUrl: URL.createObjectURL(blob),
          name: `${basename(file.name)}-page-${pageNum}.${format}`
        })
      }

      setResults(converted)
      setProgressPercent(100)
      setProgressText('Conversion completed successfully!')
    } catch (err) {
      console.error(err)
      setError('An error occurred during page rendering. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadSingle = (res) => {
    downloadBlob(res.blob, res.name)
  }

  const handleDownloadAll = async () => {
    if (results.length === 1) {
      handleDownloadSingle(results[0])
      return
    }

    setProcessing(true)
    setProgressText('Packaging files into a secure ZIP container...')
    try {
      const zip = new JSZip()
      results.forEach((res) => {
        zip.file(res.name, res.blob)
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `${basename(file.name)}-images.zip`)
    } catch (err) {
      console.error(err)
      setError('Could not package zip archive.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const handleShare = async () => {
    if (results.length === 0) return
    setProcessing(true)
    setProgressText('Preparing files for secure direct share...')
    try {
      let finalBlob
      let finalName
      if (results.length === 1) {
        finalBlob = results[0].blob
        finalName = results[0].name
      } else {
        const zip = new JSZip()
        results.forEach((res) => {
          zip.file(res.name, res.blob)
        })
        finalBlob = await zip.generateAsync({ type: 'blob' })
        finalName = `${basename(file.name)}-images.zip`
      }
      
      const fileObj = new File([finalBlob], finalName, { type: finalBlob.type || 'application/octet-stream' })
      setFileToShare(fileObj)
      navigate('/share')
    } catch (err) {
      console.error(err)
      setError('Could not prepare files for sharing.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const togglePageSelection = (pageNum) => {
    if (selectedPages.includes(pageNum)) {
      setSelectedPages(selectedPages.filter((p) => p !== pageNum))
    } else {
      setSelectedPages([...selectedPages, pageNum])
    }
  }

  const selectAll = () => {
    setSelectedPages(Array.from({ length: totalPages }, (_, i) => i + 1))
  }

  const selectNone = () => {
    setSelectedPages([])
  }

  const handleReset = () => {
    // Revoke any existing object URLs to prevent leaks
    results.forEach((res) => URL.revokeObjectURL(res.dataUrl))
    setFile(null)
    setPdfDoc(null)
    setTotalPages(0)
    setThumbnails([])
    setSelectedPages([])
    setResults([])
    setError('')
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF to JPG Converter',
    url: 'https://fileora.tech/pdf-to-jpg',
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
        <title>Convert PDF to JPG Online - High Quality Free | Fileora</title>
        <meta name="description" content="Convert PDF to JPG online for free. Extract images or render PDF pages as high-resolution JPG or PNG. 100% browser-based, private, and unlimited." />
        <link rel="canonical" href="https://fileora.tech/pdf-to-jpg" data-rh="true" />
        <meta property="og:title" content="Convert PDF to JPG Online - High Quality Free | Fileora" />
        <meta property="og:description" content="Convert PDF to JPG online for free. Extract images or render PDF pages as high-resolution JPG or PNG. 100% browser-based, private, and unlimited." />
        <meta property="og:url" content="https://fileora.tech/pdf-to-jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Convert PDF to JPG Online - High Quality Free | Fileora" />
        <meta name="twitter:description" content="Convert PDF to JPG online for free. Extract images or render PDF pages as high-resolution JPG or PNG. 100% browser-based, private, and unlimited." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Convert PDF to JPG Online</h1>
          <p>Extract all pages or select specific ones to convert into high-quality JPG or PNG images instantly. Purely client-side security.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {/* Hero loading indicator */}
        {processing && progressText && !pdfDoc && (
          <div className="container" style={{ maxWidth: '640px', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div className="loading-spinner" />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{progressText}</h3>
            <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', margin: '8px auto' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Files stay 100% on your local machine</span>
          </div>
        )}

        {!file && !processing && (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF document file to convert"
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

        {file && pdfDoc && (
          <section className="workspace-panel">
            {/* Left side preview grid */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '450px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Pages: {totalPages} | Selected: {selectedPages.length}
                </span>
                {results.length === 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={selectAll} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>Select All</button>
                    <button onClick={selectNone} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>Deselect All</button>
                  </div>
                )}
              </div>

              {/* Page layout or Results output */}
              {results.length > 0 ? (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', alignContent: 'start' }}>
                  {results.map((res) => (
                    <div 
                      key={res.pageNum} 
                      className="card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        padding: '10px', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px',
                        position: 'relative'
                      }}
                    >
                      <img 
                        src={res.dataUrl} 
                        alt={`Page ${res.pageNum}`} 
                        style={{ width: '100%', height: 'auto', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} 
                      />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Page {res.pageNum}
                      </span>
                      <button
                        onClick={() => handleDownloadSingle(res)}
                        className="btn btn-primary"
                        style={{ marginTop: '8px', padding: '4px 8px', width: '100%', fontSize: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '16px', alignContent: 'start' }}>
                  {thumbnails.map((thumb) => {
                    const isSelected = selectedPages.includes(thumb.pageNum)
                    return (
                      <div 
                        key={thumb.pageNum}
                        onClick={() => togglePageSelection(thumb.pageNum)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px',
                          background: isSelected ? 'rgba(110, 231, 183, 0.05)' : 'var(--bg-primary)',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10 }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // toggled by parent div click
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>
                        
                        {thumb.dataUrl ? (
                          <div style={{ position: 'relative', width: '100%', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                              src={thumb.dataUrl} 
                              alt={`Page ${thumb.pageNum}`} 
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} 
                            />
                            <div 
                              className="preview-trigger"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedPreview(thumb.dataUrl)
                              }}
                              style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Eye size={12} color="#fff" />
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '110px', background: 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <FileImage size={24} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Page {thumb.pageNum}</span>
                          </div>
                        )}
                        <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', marginTop: '8px' }}>
                          Page {thumb.pageNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right side settings panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Client-Side</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(file.size)}</p>
              </div>

              {results.length === 0 ? (
                <>
                  {/* Select Format */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Image Format</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => setFormat('jpg')}
                        style={{
                          padding: '8px',
                          borderRadius: '4px',
                          backgroundColor: format === 'jpg' ? 'var(--bg-tertiary)' : 'transparent',
                          color: format === 'jpg' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          fontSize: '13px'
                        }}
                      >
                        JPEG (.jpg)
                      </button>
                      <button
                        onClick={() => setFormat('png')}
                        style={{
                          padding: '8px',
                          borderRadius: '4px',
                          backgroundColor: format === 'png' ? 'var(--bg-tertiary)' : 'transparent',
                          color: format === 'png' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          fontSize: '13px'
                        }}
                      >
                        Lossless (.png)
                      </button>
                    </div>
                  </div>

                  {/* Resolution DPI preset */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Resolution (DPI)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 72, label: '72 DPI', desc: 'Web' },
                        { id: 150, label: '150 DPI', desc: 'Standard' },
                        { id: 300, label: '300 DPI', desc: 'Print' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setDpi(preset.id)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '6px',
                            backgroundColor: dpi === preset.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                            border: `2px solid ${dpi === preset.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            color: 'var(--text-primary)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                        >
                          <span>{preset.label}</span>
                          <span style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>{preset.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JPEG Quality Slider */}
                  {format === 'jpg' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>JPEG Quality</label>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{quality}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="20" 
                        max="100" 
                        value={quality} 
                        onChange={(e) => setQuality(parseInt(e.target.value))}
                        className="slider"
                      />
                    </div>
                  )}

                  {processing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Converting pages...</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{progressText}</p>
                      <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.1s' }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runConvert}
                      disabled={selectedPages.length === 0}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Render {selectedPages.length} Pages
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                    ✓ Conversion Completed!
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownloadAll}
                      disabled={processing}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Download size={18} /> {results.length === 1 ? 'Download JPG' : 'Download Images (ZIP)'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={processing}
                      className="btn btn-secondary"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        padding: '14px', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 600
                      }}
                    >
                      <Share2 size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>Share Directly (P2P)</span>
                    </button>
                  </div>

                  <ContinueWithBlob
                    sourceToolId="pdf-to-jpg"
                    blob={results[0]?.blob}
                    fileName={results[0]?.name}
                    mimeType={format === 'png' ? 'image/png' : 'image/jpeg'}
                    disabled={results.length === 0 || processing}
                  />

                  <button
                    className="btn btn-ghost"
                    onClick={() => setResults([])}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  >
                    Adjust Settings & Re-convert
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium, Fast, and Safe Client-Side PDF-to-Image Conversion</h2>
          <p className="tool-description-para">
            Extract elements or turn high-resolution documents into beautiful JPEG or lossless PNG images without losing a single pixel.
            Fileora processes everything locally in web workers to secure your files.
          </p>
          <p className="tool-description-para-last">
            ✓ Adjust output DPI (up to 300) · ✓ Select custom pages · ✓ Extract instantly with pure javascript.
          </p>
        </section>

        <HowItWorks steps={[
          ['Add PDF File', 'Upload your document securely up to 100MB.'],
          ['Choose DPI and Format', 'Choose JPG/PNG and the resolution setting (Low, Medium, High).'],
          ['Download Images', 'Save converted pages instantly as high-quality graphics or a combined ZIP file.']
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

      {/* Fullscreen Preview Lightbox */}
      {selectedPreview && (
        <div 
          onClick={() => setSelectedPreview(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: '24px'
          }}
        >
          <img 
            src={selectedPreview} 
            alt="Page Zoom View" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
          />
        </div>
      )}

      <Footer />
    </div>
  )
}
