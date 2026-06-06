import { useState, useRef, useCallback } from 'react'
import { useFileLoaderHandoff, restorePdfOutputSnapshot } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { Type, Image as ImageIcon, ArrowLeft, Shield, Download, Sparkles, Sliders, Check, RefreshCw } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, degrees as pdfDegrees, StandardFonts } from 'pdf-lib'
import { downloadBlob, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const faqs = [
  { q: 'Is my document private when using the watermark tool?', a: 'Yes. Fileora stamps watermarks on your PDF completely inside your browser using JavaScript and HTML5 canvas APIs. Your document and images never leave your computer.' },
  { q: 'Can I use my logo as a watermark?', a: 'Yes. You can toggle between a text watermark and an image watermark. You can upload any standard PNG or JPG file to stamp your logo or seal.' },
  { q: 'Can I customize the color, rotation, and opacity of the text?', a: 'Absolutely. We provide intuitive controls for custom text content, 9 placement presets, custom angle sliders, opacity settings, color selection, and font sizes.' },
  { q: 'Will the watermark be added to all pages?', a: 'Yes. By default, the watermark will be losslessly stamped onto every single page of your PDF at the exact position specified.' }
]

export default function WatermarkPdf() {
  const [file, setFile] = useState(null)

  const [previewPageUrl, setPreviewPageUrl] = useState('')
  const [pageWidth, setPageWidth] = useState(612) // standard letter width
  const [pageHeight, setPageHeight] = useState(792) // standard letter height
  
  // Watermark Settings
  const [type, setType] = useState('text') // 'text', 'image'
  const [text, setText] = useState('CONFIDENTIAL')
  const [textColor, setTextColor] = useState('#EF4444') // red
  const [opacity, setOpacity] = useState(30) // 10 to 100
  const [rotation, setRotation] = useState(45) // 0 to 360
  const [fontSize, setFontSize] = useState(48)
  const [position, setPosition] = useState('center') // 'center', 'diagonal', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  
  // Image watermark
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageScale, setImageScale] = useState(30) // percentage
  
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [downloadableBlob, setDownloadableBlob] = useState(null)
  
  const imageInputRef = useRef(null)

  const handleFile = async (selectedFile) => {
    setError('')
    setFile(selectedFile)

    setPreviewPageUrl('')
    setDownloadableBlob(null)
    setProcessing(true)
    setProgressText('Rendering PDF live canvas preview...')

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      // Render first page as a beautiful background preview
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.0 })
      
      setPageWidth(viewport.width)
      setPageHeight(viewport.height)

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      // Render page background
      await page.render({ canvasContext: context, viewport }).promise
      setPreviewPageUrl(canvas.toDataURL('image/jpeg', 0.8))
    } catch (err) {
      console.error(err)
      setError('Could not parse PDF file structure. Make sure it is not encrypted.')
      setFile(null)
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const onRestoreSnapshot = useCallback((snap) => {
    const restored = restorePdfOutputSnapshot(snap, {
      setFile,
      setDownloadableBlob,
      setError,
      setProcessing,
      resetPreview: () => setPreviewPageUrl(''),
    })
    if (!restored && snap?.file) void handleFile(snap.file)
  }, [handleFile])

  const { handoffNotice, clearHandoffNotice } = useFileLoaderHandoff('watermark-pdf', handleFile, {
    onSnapshot: onRestoreSnapshot,
  })

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setImageFile(file)
      if (imageUrl) URL.revokeObjectURL(imageUrl)
      setImageUrl(URL.createObjectURL(file))
    } else {
      setError('Please select a valid PNG or JPEG image.')
    }
  }

  // Convert HEX to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 0, b: 0 }
  }

  const runWatermark = async () => {
    if (!file) return
    setProcessing(true)
    setProgressText('Stamping watermarks on PDF structure...')
    setError('')

    try {
      await new Promise((r) => setTimeout(r, 600))
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()

      const opVal = opacity / 100
      let embeddedImage = null

      if (type === 'image' && imageFile) {
        const imageBytes = await imageFile.arrayBuffer()
        if (imageFile.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes)
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes)
        }
      }

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const pWidth = page.getWidth()
        const pHeight = page.getHeight()

        if (type === 'text' && text) {
          const rgbColor = hexToRgb(textColor)
          const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize)
          const textHeight = fontSize * 0.8
          
          let x = pWidth / 2 - textWidth / 2
          let y = pHeight / 2 - textHeight / 2
          let rot = rotation

          if (position === 'top-left') {
            x = 40
            y = pHeight - 40 - textHeight
            rot = 0
          } else if (position === 'top-right') {
            x = pWidth - textWidth - 40
            y = pHeight - 40 - textHeight
            rot = 0
          } else if (position === 'bottom-left') {
            x = 40
            y = 40
            rot = 0
          } else if (position === 'bottom-right') {
            x = pWidth - textWidth - 40
            y = 40
            rot = 0
          } else if (position === 'diagonal') {
            x = pWidth / 2 - textWidth / 2
            y = pHeight / 2 - textHeight / 2
            rot = Math.atan2(pHeight, pWidth) * (180 / Math.PI) // diagonal angle
          }

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font: helveticaFont,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            opacity: opVal,
            rotate: pdfDegrees(rot),
            zIndex: 100
          })
        } else if (type === 'image' && embeddedImage) {
          const originalWidth = embeddedImage.width
          const originalHeight = embeddedImage.height
          const scale = (pWidth * (imageScale / 100)) / originalWidth
          const width = originalWidth * scale
          const height = originalHeight * scale

          let x = pWidth / 2 - width / 2
          let y = pHeight / 2 - height / 2

          if (position === 'top-left') {
            x = 40
            y = pHeight - height - 40
          } else if (position === 'top-right') {
            x = pWidth - width - 40
            y = pHeight - height - 40
          } else if (position === 'bottom-left') {
            x = 40
            y = 40
          } else if (position === 'bottom-right') {
            x = pWidth - width - 40
            y = 40
          }

          page.drawImage(embeddedImage, {
            x,
            y,
            width,
            height,
            opacity: opVal,
            zIndex: 100
          })
        }
      }

      const bytes = await pdfDoc.save()
      const outputBlob = new Blob([bytes], { type: 'application/pdf' })
      setDownloadableBlob(outputBlob)
    } catch (err) {
      console.error(err)
      setError('An error occurred during vector stamping. Try a standard PDF document.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const handleDownload = () => {
    if (!downloadableBlob) return
    downloadBlob(downloadableBlob, `${basename(file.name)}-watermarked.pdf`)
  }

  const handleReset = () => {
    setFile(null)

    setPreviewPageUrl('')
    setDownloadableBlob(null)
    setImageFile(null)
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl('')
    setError('')
  }

  // Preview overlay styles depending on settings
  const getPreviewOverlayStyle = () => {

    const op = opacity / 100
    
    let styles = {
      position: 'absolute',
      opacity: op,
      pointerEvents: 'none',
      zIndex: 50,
      transition: 'all 0.15s ease-out'
    }

    if (position === 'center') {
      styles = {
        ...styles,
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        textAlign: 'center'
      }
    } else if (position === 'diagonal') {
      const diagAngle = Math.atan2(pageHeight, pageWidth) * (180 / Math.PI)
      styles = {
        ...styles,
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${diagAngle}deg)`,
        textAlign: 'center'
      }
    } else if (position === 'top-left') {
      styles = {
        ...styles,
        top: '40px',
        left: '40px'
      }
    } else if (position === 'top-right') {
      styles = {
        ...styles,
        top: '40px',
        right: '40px',
        textAlign: 'right'
      }
    } else if (position === 'bottom-left') {
      styles = {
        ...styles,
        bottom: '40px',
        left: '40px'
      }
    } else if (position === 'bottom-right') {
      styles = {
        ...styles,
        bottom: '40px',
        right: '40px',
        textAlign: 'right'
      }
    }

    return styles
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Watermarker',
    url: 'https://fileora.tech/watermark-pdf',
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
        <title>Add Watermark to PDF Online - Free & Private | Fileora</title>
        <meta name="description" content="Add text or image watermarks to PDF files online for free. Custom placement, opacity, rotation, colors, and sizing. Fast client-side stamp technology." />
        <link rel="canonical" href="https://fileora.tech/watermark-pdf" data-rh="true" />
        <meta property="og:title" content="Add Watermark to PDF Online - Free & Private | Fileora" />
        <meta property="og:description" content="Add text or image watermarks to PDF files online for free. Custom placement, opacity, rotation, colors, and sizing. Fast client-side stamp technology." />
        <meta property="og:url" content="https://fileora.tech/watermark-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Add Watermark to PDF Online - Free & Private | Fileora" />
        <meta name="twitter:description" content="Add text or image watermarks to PDF files online for free. Custom placement, opacity, rotation, colors, and sizing. Fast client-side stamp technology." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Add Watermark to PDF</h1>
          <p>Protect your visual property. Add customized text or image stamps onto PDF pages with pixel precision completely in your browser.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {processing && progressText && !previewPageUrl && (
          <div className="container" style={{ maxWidth: '640px', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div className="loading-spinner" />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{progressText}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Operating inside sandbox memory...</span>
          </div>
        )}

        {!file && !processing && (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="80MB"
              helpText="Select a PDF document to add watermark"
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
                  Live Watermark Canvas Preview (Page 1)
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
                  <div style={{ position: 'relative', width: '100%', maxWidth: '380px', height: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {/* Rendered page */}
                    <img 
                      src={previewPageUrl} 
                      alt="Background Preview" 
                      style={{ width: '100%', display: 'block' }} 
                    />

                    {/* Watermark layer overlay */}
                    <div style={getPreviewOverlayStyle()}>
                      {type === 'text' && text && (
                        <div style={{
                          color: textColor,
                          fontFamily: 'Helvetica, Arial, sans-serif',
                          fontWeight: 'bold',
                          fontSize: `${fontSize * 0.55}px`,
                          lineHeight: 1.1,
                          whiteSpace: 'nowrap',
                          userSelect: 'none'
                        }}>
                          {text}
                        </div>
                      )}
                      {type === 'image' && imageUrl && (
                        <img 
                          src={imageUrl} 
                          alt="Watermark Stamp" 
                          style={{ 
                            width: `${imageScale * 2.8}px`, 
                            height: 'auto',
                            maxHeight: '180px',
                            objectFit: 'contain',
                            display: 'block'
                          }} 
                        />
                      )}
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
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Local engine</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Watermark Settings
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>File: {file.name}</p>
              </div>

              {!downloadableBlob ? (
                <>
                  {/* Select stamp type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => setType('text')}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: type === 'text' ? 'var(--bg-tertiary)' : 'transparent',
                        color: type === 'text' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px'
                      }}
                    >
                      <Type size={14} /> Text
                    </button>
                    <button
                      onClick={() => setType('image')}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: type === 'image' ? 'var(--bg-tertiary)' : 'transparent',
                        color: type === 'image' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px'
                      }}
                    >
                      <ImageIcon size={14} /> Image
                    </button>
                  </div>

                  {type === 'text' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Text inputs */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Watermark Text</label>
                        <input
                          type="text"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="CONFIDENTIAL"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Font color */}
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

                      {/* Size and Rotations */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Font Size ({fontSize}px)</label>
                          <input 
                            type="range" 
                            min="14" 
                            max="90" 
                            value={fontSize} 
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            className="slider"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Angle ({rotation}°)</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            value={rotation} 
                            onChange={(e) => setRotation(parseInt(e.target.value))}
                            className="slider"
                            disabled={position === 'diagonal' || position.includes('top') || position.includes('bottom')}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Logo file upload */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Watermark Logo</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleImageUpload}
                          ref={imageInputRef}
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => imageInputRef.current.click()}
                          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                        >
                          {imageFile ? 'Change Logo Image' : 'Select PNG/JPG Logo'}
                        </button>
                        {imageFile && (
                          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', textAlign: 'center' }}>
                            ✓ Loaded: {imageFile.name}
                          </div>
                        )}
                      </div>

                      {/* Image scale */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Logo Scale ({imageScale}%)</label>
                        <input 
                          type="range" 
                          min="10" 
                          max="80" 
                          value={imageScale} 
                          onChange={(e) => setImageScale(parseInt(e.target.value))}
                          className="slider"
                          disabled={!imageFile}
                        />
                      </div>
                    </div>
                  )}

                  {/* Shared presets */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Position</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'top-left', label: 'Top Left' },
                        { id: 'center', label: 'Center' },
                        { id: 'top-right', label: 'Top Right' },
                        { id: 'bottom-left', label: 'Bottom L' },
                        { id: 'diagonal', label: 'Diagonal' },
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
                            textAlign: 'center',
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

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Watermark Opacity ({opacity}%)</label>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="100" 
                      value={opacity} 
                      onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="slider"
                    />
                  </div>

                  {processing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>Stamping PDF...</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{progressText}</p>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runWatermark}
                      disabled={type === 'image' && !imageFile}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Stamp PDF Document
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                    <Check size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    Stamping Succeeded!
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownload}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Download size={18} /> Download Watermarked PDF
                    </button>
                    {downloadableBlob && (
                      <SecureShareButton 
                        file={downloadableBlob} 
                        fileName={`${basename(file.name)}-watermarked.pdf`} 
                      />
                    )}
                  </div>
                  <ContinueWithBlob
                    sourceToolId="watermark-pdf"
                    blob={downloadableBlob}
                    fileName={`${basename(file.name)}-watermarked.pdf`}
                    mimeType="application/pdf"
                    restoreFile={file}
                    restoreSnapshot={downloadableBlob ? { file, downloadableBlob } : null}
                    disabled={processing || !downloadableBlob}
                  />

                  <button
                    className="btn btn-ghost"
                    onClick={() => setDownloadableBlob(null)}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  >
                    Adjust Stamps / Reset
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium Lossless Security Stamping for PDF Files</h2>
          <p className="tool-description-para">
            Perfectly protect bank files, intellectual drafts, and confidential contracts. 
            Because this tool stamps high-quality vector paths and image masks directly into PDF coordinate spaces, 
            watermarked layouts look absolutely crisp on zoom levels and print media without flattening pages.
          </p>
          <p className="tool-description-para-last">
            ✓ Adjust placement and rotation values · ✓ Preserve PDF text rendering structures · ✓ Fast local execution speeds.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload PDF File', 'Drag and drop your file securely into the browser workspace.'],
          ['Customize Watermark', 'Toggle text/image presets, customize placement, opacity, angles, and scale.'],
          ['Stamps and Download', 'Generate high-fidelity, client-side watermarks losslessly in seconds.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related PDF Tools</h3>
          <div className="related-tools-links">
            <a href="/protect-pdf" className="btn btn-secondary btn-related">Protect PDF</a>
            <a href="/sign-pdf" className="btn btn-secondary btn-related">Sign PDF</a>
            <a href="/crop-pdf" className="btn btn-secondary btn-related">Crop PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
