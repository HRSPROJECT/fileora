import { useState, useRef, useEffect, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { FileText, ArrowLeft, Shield, Download, Sparkles, Settings, Eye, CheckCircle } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import SecureShareButton from '../components/shared/SecureShareButton'
import * as pdfjsLib from 'pdfjs-dist'
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } from 'docx'
import { renderAsync } from 'docx-preview'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'

const faqs = [
  { q: 'How does the client-side PDF to Word conversion work?', a: 'Fileora reads your PDF file locally using PDF.js. It extracts all the text content, groups them into logical lines by parsing their coordinate positions, and then programmatically constructs a native Microsoft Word (.docx) document. No server upload occurs.' },
  { q: 'Is my data private and secure?', a: 'Yes! Your documents never leave your device. All text extraction and Word document creation happen 100% locally in your web browser, ensuring complete privacy.' },
  { q: 'Does it preserve images and layout tables?', a: 'As a client-side utility, this tool extracts all textual content and page formatting. Very complex overlapping elements or visual table lines are converted to structured text paragraphs to ensure the Word file is clean, readable, and 100% editable.' },
  { q: 'Is there a page or size limit?', a: 'No! Since processing runs locally on your computer, there are no artificial file size or page count limits. Very large files are processed seamlessly based on your browser memory.' }
]

// Dual-layer scientific formula and legacy symbol font parser
const applyMathFixes = (container) => {
  if (!container) return;

  const rawReplacements = [
    { regex: /¨/g, replace: 'ψ' },
    { regex: /"\[†/g, replace: '∫ [' },
    { regex: /¦/g, replace: 'φ' },
    { regex: /É/g, replace: 'ω' },
    { regex: /'ù\s*"²¨/g, replace: '∇²ψ' },
    { regex: /'ù/g, replace: '∇²' },
    { regex: /"²¨/g, replace: '∂²ψ' },
    { regex: /"/g, replace: '∂' },
    { regex: /†/g, replace: '∫' }
  ];

  const symbolFontMap = {
    'a': 'α', 'b': 'β', 'g': 'γ', 'd': 'δ', 'e': 'ε', 'z': 'ζ', 'h': 'η', 'q': 'θ',
    'i': 'ι', 'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'o': 'ο', 'p': 'π', 'r': 'ρ',
    's': 'σ', 't': 'τ', 'u': 'υ', 'f': 'φ', 'x': 'χ', 'y': 'ψ', 'w': 'ω', 'c': 'ς',
    'j': 'ϕ', 'v': 'ϖ',
    'A': 'Α', 'B': 'Β', 'G': 'Γ', 'D': 'Δ', 'E': 'Ε', 'Z': 'Ζ', 'H': 'Η', 'Q': 'Θ',
    'I': 'Ι', 'K': 'Κ', 'L': 'Λ', 'M': 'Μ', 'N': 'Ν', 'O': 'Ο', 'P': 'Π', 'R': 'Ρ',
    'S': 'Σ', 'T': 'Τ', 'U': 'Υ', 'F': 'Φ', 'X': 'Ξ', 'Y': 'Ψ', 'W': 'Ω', 'C': 'Χ',
    'J': 'ϑ', 'V': 'ς',
    '~': '∼', '-': '−', '*': '∗', '/': '∕', '\\': '∴', '^': '⊥'
  };

  const walk = (node) => {
    if (node.nodeType === 3) {
      let text = node.nodeValue || '';
      if (!text.trim()) return;

      let isSymbolFont = false;
      let parent = node.parentElement;
      while (parent && parent !== container) {
        const faceAttr = (parent.getAttribute && parent.getAttribute('face')) || '';
        const computedStyle = parent.style || {};
        const fontFamily = computedStyle.fontFamily || '';
        if (
          faceAttr.toLowerCase().includes('symbol') ||
          faceAttr.toLowerCase().includes('wingdings') ||
          faceAttr.toLowerCase().includes('extra') ||
          fontFamily.toLowerCase().includes('symbol') ||
          fontFamily.toLowerCase().includes('wingdings') ||
          fontFamily.toLowerCase().includes('extra')
        ) {
          isSymbolFont = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (isSymbolFont) {
        let newText = '';
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          newText += symbolFontMap[char] || char;
        }
        text = newText;
      }

      for (const rep of rawReplacements) {
        text = text.replace(rep.regex, rep.replace);
      }

      if (node.nodeValue !== text) {
        node.nodeValue = text;
      }
    } else if (node.nodeType === 1) {
      for (let child of node.childNodes) {
        walk(child);
      }
    }
  };

  walk(container);
};

const base64ToUint8Array = (base64Str) => {
  const base64Clean = base64Str.split(',')[1] || base64Str;
  const binaryString = window.atob(base64Clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export default function PdfToWord() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)
  const [convMode, setConvMode] = useState('visual') // 'text' | 'visual'

  // Document preview hub states
  const [activeTab, setActiveTab] = useState('pdf') // 'pdf' | 'docx'
  const [pdfPages, setPdfPages] = useState([]) // dataURLs of local PDF previews
  const [pdfLoading, setPdfLoading] = useState(false)

  const docxPreviewRef = useRef(null)

  const onHandoffFile = useCallback((next) => { setFile(next); setError('') }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('pdf-to-word', { onFile: onHandoffFile })

  const handleFile = (selectedFile) => {
    setError('')
    setSuccess(false)
    setResultBlob(null)
    setPdfPages([])
    setActiveTab('pdf')
    setFile(selectedFile)
  }

  // Render local PDF pages for instant responsive preview
  useEffect(() => {
    if (!file) return

    const renderPdfPreview = async () => {
      setPdfLoading(true)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
        const pdf = await loadingTask.promise
        
        const rendered = []
        // Render first 5 pages for fluid client preview (protect memory limits)
        const pagesToRender = Math.min(pdf.numPages, 5)
        
        for (let i = 1; i <= pagesToRender; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.3 }) // responsive, high clarity
          
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise
          
          rendered.push(canvas.toDataURL())
        }
        setPdfPages(rendered)
      } catch (err) {
        console.error('PDF preview generation failed:', err)
      } finally {
        setPdfLoading(false)
      }
    }

    renderPdfPreview()
  }, [file])

  // Render generated Word document preview on Tab activation
  useEffect(() => {
    if (!resultBlob || activeTab !== 'docx' || !docxPreviewRef.current) return

    const renderDocxPreview = async () => {
      try {
        docxPreviewRef.current.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><div class="loading-spinner"></div></div>'
        const arrayBuffer = await resultBlob.arrayBuffer()
        await renderAsync(arrayBuffer, docxPreviewRef.current, null, {
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: true
        })

        // Apply Layer A/B scientific parsing fixes
        applyMathFixes(docxPreviewRef.current)
      } catch (err) {
        console.error('Generated DOCX preview failed:', err)
        docxPreviewRef.current.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-secondary)">Preview generation not supported for this file type, but it is ready for download.</div>'
      }
    }

    renderDocxPreview()
  }, [resultBlob, activeTab])

  const runConvert = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    setProgressPercent(10)
    setProgressText('Extracting PDF structures...')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      
      const paragraphs = []

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgressPercent(Math.round(10 + (i / pdf.numPages) * 70))
        
        const page = await pdf.getPage(i)
        const pageViewport = page.getViewport({ scale: 1.0 })
        const pageWidth = pageViewport.width
        const pageHeight = pageViewport.height

        // 1. High-DPI Visual Replica Layer (in visual layout mode)
        if (convMode === 'visual') {
          setProgressText(`Rasterizing and rendering page ${i} of ${pdf.numPages} visual elements...`)
          const canvasScale = 1.5 // high clarity scale for crisp rendering
          const renderViewport = page.getViewport({ scale: canvasScale })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = renderViewport.height
          canvas.width = renderViewport.width

          await page.render({
            canvasContext: context,
            viewport: renderViewport
          }).promise

          const imgDataUrl = canvas.toDataURL('image/png')
          const imageBytes = base64ToUint8Array(imgDataUrl)

          // Sizing the image to fit nicely within standard Word page width
          const maxImageWidth = 550 // standard fitting width in points/pixels in docx
          const scaleFactor = maxImageWidth / pageWidth
          const imageWidth = maxImageWidth
          const imageHeight = pageHeight * scaleFactor // maintain aspect ratio

          // Push visual snapshot to docx paragraphs
          paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageBytes,
                transformation: {
                  width: imageWidth,
                  height: imageHeight,
                },
              })
            ],
            spacing: { after: 240 }
          }))
        }

        // 2. Fully Editable Text Layer (in text mode)
        if (convMode === 'text') {
          setProgressText(`Analyzing and extracting text from page ${i} of ${pdf.numPages}...`)
          const textContent = await page.getTextContent()
          
          // Robust Y-coordinate line grouping
          const linesMap = {}
          const lineThreshold = 5 // points
          
          for (const item of textContent.items) {
            if (!item.str || item.str.trim() === '') continue
            
            const y = item.transform[5]
            // Find an existing group within the lineThreshold
            let foundGroup = false
            for (const key of Object.keys(linesMap)) {
              if (Math.abs(parseFloat(key) - y) < lineThreshold) {
                linesMap[key].push(item)
                foundGroup = true
                break
              }
            }
            if (!foundGroup) {
              linesMap[y] = [item]
            }
          }

          // Sort lines from top to bottom (descending Y value)
          const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a)
          
          for (const y of sortedY) {
            // Sort character elements within a line from left to right (ascending X value)
            const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4])
            if (!lineItems.length) continue

            const firstItem = lineItems[0]
            const lastItem = lineItems[lineItems.length - 1]
            
            const minX = firstItem.transform[4]
            const maxX = lastItem.transform[4]
            const lastItemWidth = lastItem.width || 0
            
            const lineStart = minX
            const lineEnd = maxX + lastItemWidth
            const lineWidth = lineEnd - lineStart
            
            const lineCenter = lineStart + (lineWidth / 2)
            const pageCenter = pageWidth / 2

            let alignment = AlignmentType.LEFT
            // Correct alignment checking logic to avoid body centering bug
            if (lineWidth > 0 && lineWidth < pageWidth * 0.85) {
              // A centered line must start well to the right of the left margin (at least 15% of page width)
              // and must be positioned such that its midpoint is very close to the page center.
              const isCentered = (minX > pageWidth * 0.15) && (Math.abs(lineCenter - pageCenter) < 40);
              if (isCentered) {
                alignment = AlignmentType.CENTER
              } else if (Math.abs(lineEnd - (pageWidth - 54)) < 30) { // close to right margin
                alignment = AlignmentType.RIGHT
              }
            }

            const paragraphChildren = []
            let currentRunText = ''
            let currentRunBold = false
            let currentRunItalic = false
            let currentRunSize = 24 // default 12pt
            let currentRunFont = 'Arial'

            for (let idx = 0; idx < lineItems.length; idx++) {
              const item = lineItems[idx]
              const style = textContent.styles[item.fontName]
              const fontNameLower = (item.fontName || '').toLowerCase()
              const fontFamilyLower = style && style.fontFamily ? style.fontFamily.toLowerCase() : ''
              
              const isBold = fontNameLower.includes('bold') || 
                             fontNameLower.includes('bd') || 
                             fontNameLower.includes('-bold') || 
                             fontNameLower.includes('heavy') || 
                             fontNameLower.includes('black') || 
                             fontNameLower.includes('semibold') ||
                             fontFamilyLower.includes('bold') || 
                             fontFamilyLower.includes('bd') || 
                             fontFamilyLower.includes('black') || 
                             fontFamilyLower.includes('semibold')

              const isItalic = fontNameLower.includes('italic') || 
                               fontNameLower.includes('oblique') || 
                               fontNameLower.includes('it') || 
                               fontNameLower.includes('-italic') || 
                               fontNameLower.includes('-oblique') || 
                               fontFamilyLower.includes('italic') || 
                               fontFamilyLower.includes('oblique') || 
                               fontFamilyLower.includes('it')
              
              const fontHeight = item.transform[3]
              const docxSize = Math.max(12, Math.min(144, Math.round(fontHeight * 2)))

              let font = 'Arial'
              if (style && style.fontFamily) {
                const match = style.fontFamily.match(/([^,]+)/)
                if (match) {
                  font = match[1].replace(/['"]/g, '').trim()
                }
              }

              if (idx === 0) {
                currentRunText = item.str
                currentRunBold = isBold
                currentRunItalic = isItalic
                currentRunSize = docxSize
                currentRunFont = font
              } else {
                const sameFormat = (isBold === currentRunBold) && 
                                   (isItalic === currentRunItalic) && 
                                   (Math.abs(docxSize - currentRunSize) <= 1) && 
                                   (font === currentRunFont)
                
                if (sameFormat) {
                  const prevItem = lineItems[idx - 1]
                  const gap = item.transform[4] - (prevItem.transform[4] + prevItem.width)
                  if (gap > 4 && !currentRunText.endsWith(' ') && !item.str.startsWith(' ')) {
                    currentRunText += ' '
                  }
                  currentRunText += item.str
                } else {
                  if (currentRunText) {
                    paragraphChildren.push(new TextRun({
                      text: currentRunText,
                      bold: currentRunBold,
                      italic: currentRunItalic,
                      size: currentRunSize,
                      font: currentRunFont
                    }))
                  }
                  currentRunText = item.str
                  currentRunBold = isBold
                  currentRunItalic = isItalic
                  currentRunSize = docxSize
                  currentRunFont = font
                }
              }
            }

            if (currentRunText) {
              paragraphChildren.push(new TextRun({
                text: currentRunText,
                bold: currentRunBold,
                italic: currentRunItalic,
                size: currentRunSize,
                font: currentRunFont
              }))
            }

            if (paragraphChildren.length > 0) {
              paragraphs.push(new Paragraph({
                alignment: alignment,
                children: paragraphChildren,
                spacing: { after: 120 }
              }))
            }
          }
        }

        // Add page break for subsequent pages
        if (i < pdf.numPages) {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: '',
                pageBreakBefore: true
              })
            ]
          }))
        }
      }

      setProgressText('Assembling editable Word document...')
      setProgressPercent(85)

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })

      const blob = await Packer.toBlob(doc)
      setResultBlob(blob)
      setSuccess(true)
      setProgressPercent(100)
      setProgressText('Completed successfully!')
      setActiveTab('docx') // automatically flip tab to Generated Word DOCX
    } catch (err) {
      console.error(err)
      setError('Failed to convert PDF. The file may be password-protected or corrupted.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    downloadBlob(resultBlob, `${basename(file.name)}.docx`)
  }

  const handleReset = () => {
    setFile(null)
    setError('')
    setSuccess(false)
    setResultBlob(null)
    setPdfPages([])
    setActiveTab('pdf')
    setProgressPercent(0)
    setProgressText('')
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora PDF to Word Converter',
    url: 'https://fileora.tech/pdf-to-word',
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
        <title>Convert PDF to Word Online - Free & Editable | Fileora</title>
        <meta name="description" content="Convert PDF documents into editable Word Docx files online for free. Pure client-side privacy with no uploads. Instant, safe, and professional text conversion." />
        <link rel="canonical" href="https://fileora.tech/pdf-to-word" data-rh="true" />
        <meta property="og:title" content="Convert PDF to Word Online - Free & Editable | Fileora" />
        <meta property="og:description" content="Convert PDF documents into editable Word Docx files online for free. Pure client-side privacy with no uploads. Instant, safe, and professional text conversion." />
        <meta property="og:url" content="https://fileora.tech/pdf-to-word" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Convert PDF to Word Online - Free & Editable | Fileora" />
        <meta name="twitter:description" content="Convert PDF documents into editable Word Docx files online for free. Pure client-side privacy with no uploads. Instant, safe, and professional text conversion." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Convert PDF to Word</h1>
          <p>Extract text runs and structure from PDF files and assemble them into fully editable Microsoft Word DOCX files locally in your browser.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {processing && progressText && (
          <div className="container" style={{ maxWidth: '640px', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div className="loading-spinner" />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{progressText}</h3>
            <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', margin: '8px auto' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Note: Extraction occurs 100% on your local machine.</span>
          </div>
        )}

        {!file && !processing && (
          <div className="container container-narrow">
            <DropZone
              accept="application/pdf"
              maxSizeLabel="100MB"
              helpText="Select a PDF document to convert to Word"
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

        {file && !processing && (
          <section className="container" style={{ marginBottom: '32px' }}>
            
            {/* Symmetrical Responsive Workspace Grid */}
            <div className="responsive-workspace converter-workspace">
              
              {/* Left Panel: Conversion Controls & Reset Button */}
              <div className="workspace-controls-sidebar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                    <ArrowLeft size={16} /> Reset
                  </button>
                  <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Client-Side</div>
                </div>

                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <FileText size={42} style={{ color: 'var(--accent-primary)', marginBottom: '8px' }} />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {file.name}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size: {formatBytes(file.size)}</p>
                </div>

                {!success ? (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        <Settings size={12} /> Conversion Mode
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { id: 'text', label: 'Document Text Only', desc: 'Clean, fully editable text (No images)' },
                          { id: 'visual', label: 'Visual Layout Only', desc: 'Exact picture pages (Not editable)' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setConvMode(mode.id)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              backgroundColor: convMode === mode.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                              border: `2px solid ${convMode === mode.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                              color: 'var(--text-primary)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{mode.label}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{mode.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runConvert}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Convert to Word (.docx)
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <CheckCircle size={16} /> Conversion Completed!
                    </div>
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownload}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Download size={18} /> Download Word Document
                    </button>
                    {resultBlob && (
                      <SecureShareButton 
                        file={resultBlob} 
                        fileName={`${basename(file.name)}.docx`} 
                      />
                    )}
                  </div>
                  <ContinueWithBlob
                    sourceToolId="pdf-to-word"
                    blob={resultBlob}
                    fileName={`${basename(file.name)}.docx`}
                    mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    restoreFile={file}
                    disabled={processing || !resultBlob}
                  />
                  </div>
                )}
              </div>

              {/* Right Panel: Symmetrical Preview Workspace */}
              <div className="workspace-preview-container">
                <div className="workspace-preview-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <Eye size={18} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Document Preview Hub</span>
                  </div>

                  {/* Tabs Selector */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setActiveTab('pdf')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: activeTab === 'pdf' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: activeTab === 'pdf' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Uploaded PDF
                    </button>
                    <button
                      onClick={() => success && setActiveTab('docx')}
                      disabled={!success}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: activeTab === 'docx' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: activeTab === 'docx' ? '#fff' : 'var(--text-secondary)',
                        cursor: success ? 'pointer' : 'not-allowed',
                        opacity: success ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      Generated Word
                    </button>
                  </div>
                </div>

                {/* Document View Area */}
                <div className="document-view-area">
                  
                  {/* Tab 1: Uploaded PDF Canvas Previews */}
                  {activeTab === 'pdf' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pdfLoading && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                          <div className="loading-spinner" />
                        </div>
                      )}
                      {!pdfLoading && pdfPages.map((imgSrc, idx) => (
                        <div key={idx} style={{ position: 'relative', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid var(--border-color)' }}>
                          <div style={{ position: 'absolute', top: '10px', left: '10px', padding: '4px 10px', background: 'rgba(0,0,0,0.75)', color: '#ffffff', fontSize: '10px', fontWeight: 600, borderRadius: '4px', zIndex: 10 }}>
                            Page {idx + 1}
                          </div>
                          <img 
                            src={imgSrc} 
                            alt={`PDF Page ${idx + 1}`} 
                            style={{ width: '100%', height: 'auto', display: 'block' }} 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Generated Word DOCX preview (rendered via docx-preview) */}
                  {activeTab === 'docx' && (
                    <div 
                      ref={docxPreviewRef} 
                      className="docx-render-host" 
                    />
                  )}

                </div>
              </div>

            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Clean, Private, and High-Fidelity PDF-to-Word Conversion</h2>
          <p className="tool-description-para">
            Transform standard PDF scans, invoices, ebooks, and documents into clean Microsoft Word files in seconds. 
            Because this tool executes 100% inside your web browser sandbox using modern HTML5 file APIs, your document data is completely protected from being sent to external databases or servers.
          </p>
          <p className="tool-description-para-last">
            ✓ Professional client-side parsing · ✓ Standard margins and layout reconstruction · ✓ High compatibility Microsoft Word format.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload Your PDF', 'Drag or upload your PDF file securely into your local browser sandbox.'],
          ['Extract & Assemble', 'Our local JavaScript engine reads coordinates and re-forms paragraphs into native Word syntax.'],
          ['Download DOCX', 'Trigger a direct download of your fully editable Word document instantly.']
        ]} />
        <FaqSection faqs={faqs} />
      </main>

      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@fontsource/stix-two-math@5.0.18/index.css');

        .workspace-preview-container {
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 520px;
          overflow: hidden;
        }

        .workspace-preview-header {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .document-view-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto !important;
          max-height: 550px;
          background: var(--bg-primary);
          border-radius: 6px;
          border: 1px solid var(--border-color);
          padding: 16px;
          box-sizing: border-box;
        }

        /* Responsive Previews */
        @media (max-width: 640px) {
          .workspace-preview-container {
            min-height: 380px;
            padding: 1rem;
          }
          .document-view-area {
            max-height: 400px;
            padding: 8px;
          }
        }

        /* Shield docx-preview rendering container from any host dark theme color values leakage */
        .docx-render-host {
          background-color: #ffffff !important;
          color: #000000 !important;
          border-radius: 4px;
          overflow-x: auto !important;
        }
        .docx-render-host .docx-wrapper {
          background-color: #f1f5f9 !important;
          padding: 24px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .docx-render-host .docx {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important;
          margin-bottom: 0 !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          width: 100% !important;
          max-width: 800px !important;
          min-height: auto !important;
          padding: 32px !important;
          box-sizing: border-box !important;
        }

        @media (max-width: 640px) {
          .docx-render-host .docx-wrapper {
            padding: 12px !important;
          }
          .docx-render-host .docx {
            padding: 16px !important;
          }
        }

        .docx-render-host table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        .docx-render-host th, .docx-render-host td {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 8px !important;
          background-color: transparent !important;
        }
        .docx-render-host p, .docx-render-host span, .docx-render-host h1, .docx-render-host h2, .docx-render-host h3, .docx-render-host h4, .docx-render-host h5, .docx-render-host h6 {
          color: #000000;
        }

        /* Enable premium scientific font for math elements */
        .docx-render-host math, .docx-render-host m:oMath, .docx-render-host span.math {
          font-family: "STIX Two Math", "Cambria Math", "Segoe UI Symbol", sans-serif !important;
        }
      `}</style>
      <Footer />
    </div>
  )
}
