import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { PenTool, Type, Image as ImageIcon, ArrowLeft, Shield, Download, Sparkles, Sliders, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const faqs = [
  { q: 'How can I create a signature in Fileora?', a: 'You can create a signature in three premium ways: Type your name and select elegant cursive styles; Draw your signature using a smooth canvas brush; or Upload a scanned PNG/JPG image signature.' },
  { q: 'Can I place the signature on any page of the PDF?', a: 'Yes! You can flip through all pages of your PDF document in our visual reader, choose your target page, and drag or resize the signature stamp anywhere with pixel precision.' },
  { q: 'Will the signature look blurry when printed?', a: 'Not at all. Fileora embeds your signature as a crisp transparency layer inside the PDF vector model using pdf-lib. The output maintains maximum graphic resolution.' },
  { q: 'Are my signed documents confidential?', a: '100% private. Fileora signs documents entirely within your browser memory. Your documents and signature coordinates never leave your device.' }
]

const SIGN_FONTS = [
  { name: 'Elegant Script', family: '"Great Vibes", cursive, sans-serif', import: '@import url("https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap");' },
  { name: 'Casual Hand', family: '"Caveat", cursive, sans-serif', import: '@import url("https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap");' },
  { name: 'Brush Calligraphy', family: '"Pacifico", cursive, sans-serif', import: '@import url("https://fonts.googleapis.com/css2?family=Pacifico&display=swap");' }
]

export default function SignPdf() {
  const [file, setFile] = useState(null)
  const [pdfDocJS, setPdfDocJS] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Rendered page details
  const [previewPageUrl, setPreviewPageUrl] = useState('')
  const [pageWidth, setPageWidth] = useState(612)
  const [pageHeight, setPageHeight] = useState(792)

  // Signature Type Selection
  const [signType, setSignType] = useState('draw') // 'draw', 'type', 'upload'
  const [typedName, setTypedName] = useState('')
  const [selectedFontIndex, setSelectedFontIndex] = useState(0)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')

  // Drag-and-Drop Placement Coordinates (in preview px dimensions)
  const [sigWidth, setSigWidth] = useState(140)
  const [sigHeight, setSigHeight] = useState(70)
  const [sigX, setSigX] = useState(50)
  const [sigY, setSigY] = useState(50)
  
  // Active dragging flags
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [downloadableBlob, setDownloadableBlob] = useState(null)

  const drawCanvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const prevPosRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load PDF file
  const handleFile = async (selectedFile) => {
    setError('')
    setFile(selectedFile)
    setPdfDocJS(null)
    setPreviewPageUrl('')
    setDownloadableBlob(null)
    setProcessing(true)
    setProgressText('Loading PDF page outlines...')

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      setPdfDocJS(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      await renderPage(pdf, 1)
    } catch (err) {
      console.error(err)
      setError('Could not read PDF. Make sure it is not password protected.')
      setFile(null)
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  // Render a specific page as background preview
  const renderPage = async (pdf, pageNumber) => {
    try {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.0 })
      
      setPageWidth(viewport.width)
      setPageHeight(viewport.height)

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: context, viewport }).promise
      setPreviewPageUrl(canvas.toDataURL('image/jpeg', 0.85))
    } catch (err) {
      console.error('Error rendering PDF page preview:', err)
    }
  }

  // Watch page changes
  useEffect(() => {
    if (pdfDocJS && currentPage) {
      renderPage(pdfDocJS, currentPage)
    }
  }, [currentPage])

  // Canvas Drawing Handlers
  useEffect(() => {
    if (signType === 'draw' && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [signType])

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    isDrawingRef.current = true
    prevPosRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const drawMove = (e) => {
    if (!isDrawingRef.current || !drawCanvasRef.current) return
    e.preventDefault()
    const canvas = drawCanvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    const currentX = clientX - rect.left
    const currentY = clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(prevPosRef.current.x, prevPosRef.current.y)
    ctx.lineTo(currentX, currentY)
    ctx.stroke()

    prevPosRef.current = { x: currentX, y: currentY }
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // Handle uploaded stamp image signature
  const handleSignatureUpload = (e) => {
    const img = e.target.files[0]
    if (img && (img.type === 'image/png' || img.type === 'image/jpeg')) {
      setUploadedImage(img)
      if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl)
      setUploadedImageUrl(URL.createObjectURL(img))
    }
  }

  // Handle Drag-and-Drop / Resize over target canvas layout
  const onDragStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX, y: clientY })
  }

  const onResizeStart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX, y: clientY })
  }

  const onWorkspaceMove = (e) => {
    if (!isDragging && !isResizing) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const deltaX = clientX - dragStart.x
    const deltaY = clientY - dragStart.y
    setDragStart({ x: clientX, y: clientY })

    if (isDragging) {
      setSigX((x) => {
        const nextX = x + deltaX
        return Math.max(0, Math.min(pageWidth - sigWidth, nextX))
      })
      setSigY((y) => {
        const nextY = y + deltaY
        return Math.max(0, Math.min(pageHeight - sigHeight, nextY))
      })
    } else if (isResizing) {
      setSigWidth((w) => Math.max(60, Math.min(pageWidth - sigX, w + deltaX)))
      setSigHeight((h) => Math.max(30, Math.min(pageHeight - sigY, h + deltaY)))
    }
  }

  const onWorkspaceEnd = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  // Generate signature asset to draw/stamp in PDF coordinates
  const generateSignatureImage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 400, 200)

    if (signType === 'draw' && drawCanvasRef.current) {
      // Draw signature from reference
      return drawCanvasRef.current.toDataURL('image/png')
    } else if (signType === 'type' && typedName) {
      // Render cursive style
      ctx.fillStyle = '#000000'
      ctx.font = `bold 44px ${SIGN_FONTS[selectedFontIndex].family}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedName, 200, 100)
      return canvas.toDataURL('image/png')
    } else if (signType === 'upload' && uploadedImageUrl) {
      // Return uploaded image URI
      return uploadedImageUrl
    }
    return null
  }

  // Execute pdf-lib signing process
  const runSign = async () => {
    if (!file) return
    const signatureDataUrl = generateSignatureImage()
    if (!signatureDataUrl) {
      setError('Please draw, type, or upload a signature before stamping.')
      return
    }

    setProcessing(true)
    setProgressText('Stamping signature onto PDF layout...')
    setError('')

    try {
      await new Promise((r) => setTimeout(r, 600))
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const page = pages[currentPage - 1]

      // Embed signature image
      const sigResponse = await fetch(signatureDataUrl)
      const sigImgBytes = await sigResponse.arrayBuffer()
      
      let embeddedSig = null
      if (signatureDataUrl.startsWith('data:image/png') || signatureDataUrl.includes('.png')) {
        embeddedSig = await pdfDoc.embedPng(sigImgBytes)
      } else {
        embeddedSig = await pdfDoc.embedJpg(sigImgBytes)
      }

      // Calculate matching target coordinate offsets in PDF coordinate space (PDF spaces are y-axis inverted from bottom-left!)
      const pWidth = page.getWidth()
      const pHeight = page.getHeight()
      
      const scaleX = pWidth / pageWidth
      const scaleY = pHeight / pageHeight

      const stampW = sigWidth * scaleX
      const stampH = sigHeight * scaleY
      const stampX = sigX * scaleX
      // PDF y-coordinate starts from bottom! Convert from top layout offset
      const stampY = pHeight - (sigY * scaleY) - stampH

      page.drawImage(embeddedSig, {
        x: stampX,
        y: stampY,
        width: stampW,
        height: stampH,
        zIndex: 150
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      setDownloadableBlob(blob)
    } catch (err) {
      console.error(err)
      setError('An error occurred during vector signing. Verify document encryption.')
    } finally {
      setProcessing(false)
      setProgressText('')
    }
  }

  const handleDownload = () => {
    if (!downloadableBlob) return
    downloadBlob(downloadableBlob, `${basename(file.name)}-signed.pdf`)
  }

  const handleReset = () => {
    setFile(null)
    setPdfDocJS(null)
    setPreviewPageUrl('')
    setDownloadableBlob(null)
    setTypedName('')
    setUploadedImage(null)
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl)
    setUploadedImageUrl('')
    setError('')
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF Signer',
    url: 'https://fileora.tech/sign-pdf',
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
        <title>Sign PDF Online - Draw or Type PDF Signatures | Fileora</title>
        <meta name="description" content="Sign PDF files online for free. Type standard cursive signatures, draw smooth custom signatures, or upload transparent image PNG stamps. Drag-resizable layout." />
        <link rel="canonical" href="https://fileora.tech/sign-pdf" />
        <meta property="og:title" content="Sign PDF Online - Draw or Type PDF Signatures | Fileora" />
        <meta property="og:description" content="Sign PDF files online for free. Type standard cursive signatures, draw smooth custom signatures, or upload transparent image PNG stamps. Drag-resizable layout." />
        <meta property="og:url" content="https://fileora.tech/sign-pdf" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <style>
          {SIGN_FONTS.map(f => f.import).join('\n')}
        </style>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Sign PDF Online</h1>
          <p>Create stylized digital signatures and position them anywhere on your documents losslessly completely inside your browser.</p>
        </section>

        {!file && (
          <div className="container" style={{ maxWidth: '640px' }}>
            <DropZone
              accept="application/pdf"
              maxSizeLabel="80MB"
              helpText="Select a PDF document file to sign"
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

        {file && previewPageUrl && (
          <section className="workspace-panel">
            {/* Left side preview & navigation */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '480px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Visual Layout Grid (Page {currentPage} of {totalPages})
                </span>
                
                {totalPages > 1 && !downloadableBlob && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                      className="btn btn-ghost" 
                      style={{ padding: '6px' }}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{currentPage}</span>
                    <button 
                      onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                      className="btn btn-ghost" 
                      style={{ padding: '6px' }}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Central render workspace */}
              <div 
                ref={containerRef}
                onMouseMove={onWorkspaceMove}
                onTouchMove={onWorkspaceMove}
                onMouseUp={onWorkspaceEnd}
                onTouchEnd={onWorkspaceEnd}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'auto' }}
              >
                {downloadableBlob ? (
                  <iframe
                    src={URL.createObjectURL(downloadableBlob) + '#toolbar=0'}
                    title="PDF Preview"
                    style={{ width: '100%', height: '100%', minHeight: '400px', border: 'none', borderRadius: '4px' }}
                  />
                ) : (
                  <div style={{ position: 'relative', width: `${pageWidth}px`, height: `${pageHeight}px`, border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', userSelect: 'none' }}>
                    <img 
                      src={previewPageUrl} 
                      alt="Current PDF page" 
                      style={{ width: '100%', height: '100%', display: 'block' }} 
                    />

                    {/* Drag-resizable visual signature stamp layer */}
                    <div 
                      onMouseDown={onDragStart}
                      onTouchStart={onDragStart}
                      style={{
                        position: 'absolute',
                        left: `${sigX}px`,
                        top: `${sigY}px`,
                        width: `${sigWidth}px`,
                        height: `${sigHeight}px`,
                        border: '2px dashed var(--accent-primary)',
                        cursor: 'move',
                        zIndex: 100,
                        backgroundColor: 'rgba(110, 231, 183, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Cursive style */}
                      {signType === 'type' && typedName && (
                        <span style={{ 
                          fontSize: `${sigHeight * 0.45}px`, 
                          color: '#000', 
                          fontFamily: SIGN_FONTS[selectedFontIndex].family, 
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none' 
                        }}>
                          {typedName}
                        </span>
                      )}

                      {/* Canvas stroke image */}
                      {signType === 'draw' && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, opacity: 0.6 }}>SIGNATURE DRAG PREVIEW</span>
                        </div>
                      )}

                      {/* Scan image */}
                      {signType === 'upload' && uploadedImageUrl && (
                        <img 
                          src={uploadedImageUrl} 
                          alt="Uploaded Stamp" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                        />
                      )}

                      {/* Resize drag anchor point bottom-right */}
                      <div 
                        onMouseDown={onResizeStart}
                        onTouchStart={onResizeStart}
                        style={{
                          position: 'absolute',
                          right: '-4px',
                          bottom: '-4px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: 'var(--accent-primary)',
                          borderRadius: '50%',
                          cursor: 'se-resize',
                          zIndex: 110
                        }}
                      />
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
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Create Signature
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>File: {file.name}</p>
              </div>

              {error && (
                <div style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}

              {!downloadableBlob ? (
                <>
                  {/* Mode switcher tabs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {[
                      { id: 'draw', label: 'Draw', icon: <PenTool size={13} /> },
                      { id: 'type', label: 'Type', icon: <Type size={13} /> },
                      { id: 'upload', label: 'Upload', icon: <ImageIcon size={13} /> }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSignType(tab.id)}
                        style={{
                          padding: '8px 2px',
                          borderRadius: '4px',
                          backgroundColor: signType === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                          color: signType === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '11px'
                        }}
                      >
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Mode Panels */}
                  {signType === 'draw' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ position: 'relative', width: '100%', height: '140px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <canvas
                          ref={drawCanvasRef}
                          onMouseDown={startDrawing}
                          onMouseMove={drawMove}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={drawMove}
                          onTouchEnd={stopDrawing}
                          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
                        />
                      </div>
                      <button
                        onClick={clearDrawing}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', fontSize: '11px' }}
                      >
                        <Trash2 size={13} /> Clear Signature Pad
                      </button>
                    </div>
                  )}

                  {signType === 'type' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Enter Signature Text</label>
                        <input
                          type="text"
                          value={typedName}
                          onChange={(e) => setTypedName(e.target.value)}
                          placeholder="Your Full Name"
                          maxLength={32}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {typedName && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Signature Typography Model</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {SIGN_FONTS.map((font, idx) => (
                              <button
                                key={font.name}
                                onClick={() => setSelectedFontIndex(idx)}
                                style={{
                                  padding: '12px 8px',
                                  backgroundColor: selectedFontIndex === idx ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                                  border: `1.5px solid ${selectedFontIndex === idx ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                  borderRadius: '6px',
                                  color: selectedFontIndex === idx ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  fontFamily: font.family,
                                  fontSize: '20px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {typedName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {signType === 'upload' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleSignatureUpload}
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current.click()}
                        style={{ padding: '12px', width: '100%', fontSize: '13px' }}
                      >
                        {uploadedImage ? 'Change Image' : 'Select Scanned Signature PNG'}
                      </button>
                      {uploadedImage && (
                        <div style={{ fontSize: '11px', color: 'var(--success)', textAlign: 'center' }}>
                          ✓ Loaded: {uploadedImage.name}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Stamp Size Scaling</label>
                    </div>
                    <input 
                      type="range" 
                      min="60" 
                      max="300" 
                      value={sigWidth} 
                      onChange={(e) => {
                        const nextW = parseInt(e.target.value)
                        setSigWidth(nextW)
                        setSigHeight(Math.round(nextW / 2))
                      }}
                      className="slider"
                    />
                  </div>

                  {processing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>Stamping signature...</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runSign}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Apply Signature to PDF
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                    <Check size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    Signature Embedded!
                  </div>
                  
                  <button
                    className="btn btn-primary btn-gradient"
                    onClick={handleDownload}
                    style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                  >
                    <Download size={18} /> Download Signed PDF
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => setDownloadableBlob(null)}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  >
                    Adjust Sign / Reset
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container" style={{ margin: '48px auto', maxWidth: '800px', lineHeight: '1.6' }}>
          <h2>Premium Vector Stamping for Digital Signatures</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Instantly authenticate leasing letters, client NDA documents, and administrative forms securely. 
            Because Fileora embeds transparency nodes inside the PDF file coordinate space, signature graphics scale losslessly without compromising document layout.
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            ✓ Typed, drawn, and image stamp configurations · ✓ Precision drag-and-resize placement grid · ✓ Complete bank-level security.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload Document PDF', 'Drop your target document file up to 80MB inside the browser console.'],
          ['Create Signature Asset', 'Draw custom strokes on the touch pad, type cursive typography names, or upload stamp transparent images.'],
          ['Drag, Position, & Export', 'Place signature anywhere over the visual pages, resize with click handles, and download your signed PDF.']
        ]} />
        <FaqSection faqs={faqs} />
      </main>
      <Footer />
    </div>
  )
}
