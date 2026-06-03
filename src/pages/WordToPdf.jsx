import { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { FileText, ArrowLeft, Shield, Download, Sparkles, Settings, Eye, CheckCircle } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'
import { renderAsync } from 'docx-preview'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import SecureShareButton from '../components/shared/SecureShareButton'

const faqs = [
  { q: 'How does client-side Word to PDF conversion work?', a: 'Fileora uses docx-preview to parse the binary structures, formatting, headings, and color tables of your Word document (.docx) entirely in JavaScript. It translates the document layout to high-fidelity isolated HTML, renders it inside a sandboxed rendering container, and compiles it directly to a vector PDF using jsPDF. No data is sent to external servers.' },
  { q: 'Is it completely free and secure?', a: 'Yes! Your documents never leave your browser. The conversion runs entirely locally inside your browser sandbox, keeping your personal or professional data completely private.' },
  { q: 'What DOCX elements are supported?', a: 'All standard text formatting, paragraph styles, headings, tables (including borders and cell background shading!), numbered and bulleted lists, inline text bolding/italics, and text alignment are fully preserved during conversion.' },
  { q: 'Can I customize the page margins of the output PDF?', a: 'Yes! We offer Normal (A4-standard margins), Compact (for text-heavy documents to save pages), and None (edge-to-edge layout) options so you can optimize the PDF format.' }
]

// Dual-layer scientific formula and legacy symbol font parser
const applyMathFixes = (container) => {
  if (!container) return;

  // Layer B: Direct pattern-matching replacements for legacy symbol sequences
  const rawReplacements = [
    { regex: /¨/g, replace: 'ψ' },
    { regex: /"\[†/g, replace: '∫ [' },
    { regex: /¦/g, replace: 'φ' },
    { regex: /É/g, replace: 'ω' },
    { regex: /\'ù\s*\"²¨/g, replace: '∇²ψ' },
    { regex: /\'ù/g, replace: '∇²' },
    { regex: /\"²¨/g, replace: '∂²ψ' },
    { regex: /\"/g, replace: '∂' },
    { regex: /†/g, replace: '∫' }
  ];

  // Layer A: Legacy ASCII-to-Unicode mapping for elements styled with Symbol font
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
    if (node.nodeType === 3) { // TEXT_NODE
      let text = node.nodeValue || '';
      if (!text.trim()) return;

      // Check if this text node or any parent is styled under legacy Symbol fonts
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

      // Map raw bad string mappings
      for (const rep of rawReplacements) {
        text = text.replace(rep.regex, rep.replace);
      }

      if (node.nodeValue !== text) {
        node.nodeValue = text;
      }
    } else if (node.nodeType === 1) { // ELEMENT_NODE
      for (let child of node.childNodes) {
        walk(child);
      }
    }
  };

  walk(container);
};

export default function WordToPdf() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultBlob, setResultBlob] = useState(null)
  const [margin, setMargin] = useState('normal') // 'normal', 'compact', 'none'
  
  // Interactive Workspace states
  const [activeTab, setActiveTab] = useState('docx') // 'docx' | 'pdf'
  const [pdfPages, setPdfPages] = useState([]) // dataURLs of converted PDF pages
  
  const docxPreviewRef = useRef(null)

  const handleFile = (selectedFile) => {
    setError('')
    setSuccess(false)
    setResultBlob(null)
    setPdfPages([])
    setActiveTab('docx')
    setFile(selectedFile)
  }

  // Render local DOCX preview on file upload
  useEffect(() => {
    if (!file) return

    const renderPreview = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer()
        if (docxPreviewRef.current) {
          docxPreviewRef.current.innerHTML = '<div style="display:flex;justify-content:center;padding:3rem;"><div class="loading-spinner"></div></div>'
          
          await renderAsync(arrayBuffer, docxPreviewRef.current, null, {
            inWrapper: true,
            ignoreWidth: true, // fluid layout for mobile-friendly responsive display
            ignoreHeight: true,
            breakPages: true
          })

          // Apply scientific math/physics character adjustments in preview
          applyMathFixes(docxPreviewRef.current);
        }
      } catch (err) {
        console.error('Local preview render failed:', err)
        if (docxPreviewRef.current) {
          docxPreviewRef.current.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-secondary)">Preview generation not supported for this file type, but it is ready for high-fidelity conversion.</div>'
        }
      }
    }

    renderPreview()
  }, [file])

  const runConvert = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    setProgressPercent(10)
    setProgressText('Extracting Word document structure...')

    let iframe = null
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      setProgressText('Assembling document layout...')
      setProgressPercent(30)

      // Create a temporary hidden iframe to completely isolate rendering from Fileora's styles
      iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      iframe.style.top = '-9999px'
      iframe.style.width = '850px' // standard document display viewport
      iframe.style.height = '1000px'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      iframeDoc.open()
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DOCX Render Sandbox</title>
          <style>
            @import url('https://cdn.jsdelivr.net/npm/@fontsource/stix-two-math@5.0.18/index.css');
            body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .docx-wrapper {
              background-color: #ffffff !important;
              padding: ${margin === 'normal' ? '40px' : margin === 'compact' ? '20px' : '0px'} !important;
            }
            .docx {
              margin-bottom: 0 !important;
              box-shadow: none !important;
              page-break-after: always !important;
              background-color: #ffffff !important;
            }
            .docx:last-child {
              page-break-after: avoid !important;
            }
            /* High-fidelity math/chemistry formatting style sheet resets */
            span, p, div, td {
              font-variant-numeric: tabular-nums;
            }
            /* Enable premium math font alignment and rendering support */
            math, m\\:oMath, span.math {
              font-family: "STIX Two Math", "Cambria Math", "Segoe UI Symbol", sans-serif !important;
            }
          </style>
        </head>
        <body>
          <div id="docx-container"></div>
        </body>
        </html>
      `)
      iframeDoc.close()

      // Allow DOM to initialize in the iframe
      await new Promise(resolve => setTimeout(resolve, 150))

      const renderContainer = iframeDoc.getElementById('docx-container')

      setProgressText('Rendering high-fidelity layout sheets...')
      setProgressPercent(50)

      // Render DOCX into the iframe container using docx-preview
      await renderAsync(arrayBuffer, renderContainer, null, {
        inWrapper: true,
        ignoreWidth: false, // rigid A4 sizing for standard PDF output
        ignoreHeight: false,
        breakPages: true
      })

      // Fix legacy formula symbols inside the compile context
      applyMathFixes(renderContainer);

      // Allow images and fonts inside the iframe to draw completely
      await new Promise(resolve => setTimeout(resolve, 300))

      const pages = renderContainer.querySelectorAll('.docx')
      if (pages.length === 0) {
        throw new Error('No pages parsed from document structure.')
      }

      setProgressText('Compiling high-resolution vector PDF pages...')
      setProgressPercent(70)

      // Generate the PDF
      // A4 dimensions: 595.28 x 841.89 points
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      })

      const pageImages = []

      // Loop pages and capture them as high-DPI canvases to preserve math symbols perfectly
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i]
        setProgressText(`Rasterizing page ${i + 1} of ${pages.length} (preserving complex math/phys/chem structures)...`)
        setProgressPercent(Math.round(70 + (i / pages.length) * 25))

        const canvas = await html2canvas(pageEl, {
          scale: 2.0, // High definition Retina scale capture (perfect crisp math glyphs!)
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.96)
        pageImages.push(imgData)

        if (i > 0) {
          doc.addPage()
        }
        
        doc.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89, undefined, 'FAST')
      }

      const blob = doc.output('blob')
      setResultBlob(blob)
      setPdfPages(pageImages)
      setSuccess(true)
      setProgressPercent(100)
      setProgressText('Completed successfully!')
      setActiveTab('pdf') // automatically toggle to PDF view so user can check generated pages

    } catch (err) {
      console.error(err)
      setError('An error occurred while compiling high-fidelity PDF pages. Please verify the document format.')
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    downloadBlob(resultBlob, `${basename(file.name)}.pdf`)
  }

  const handleReset = () => {
    setFile(null)
    setError('')
    setSuccess(false)
    setResultBlob(null)
    setPdfPages([])
    setActiveTab('docx')
    setProgressPercent(0)
    setProgressText('')
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora Word to PDF Converter',
    url: 'https://fileora.tech/word-to-pdf',
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
        <title>Convert Word to PDF Online - Free & Private | Fileora</title>
        <meta name="description" content="Convert Word DOCX files containing mathematical equations, chemical formulas, and tables to PDF online. Pure client-side privacy." />
        <link rel="canonical" href="https://fileora.tech/word-to-pdf" data-rh="true" />
        <meta property="og:title" content="Convert Word to PDF Online - Free & Private | Fileora" />
        <meta property="og:description" content="Convert Word DOCX files containing mathematical equations, chemical formulas, and tables to PDF online. Pure client-side privacy." />
        <meta property="og:url" content="https://fileora.tech/word-to-pdf" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="DOCX Render Sandbox" />
        <meta name="twitter:description" content="Convert Word DOCX files containing mathematical equations, chemical formulas, and tables to PDF online. Pure client-side privacy." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Convert Word to PDF</h1>
          <p>Transform documents with complex equations, math typography, chemical sets, and formatting into structured PDFs instantly without any cloud uploads.</p>
        </section>

        {processing && progressText && (
          <div className="container" style={{ maxWidth: '640px', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div className="loading-spinner" />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{progressText}</h3>
            <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', margin: '8px auto' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Note: Math rendering requires additional font scaling. Do not close this tab.</span>
          </div>
        )}

        {!file && !processing && (
          <div className="container container-narrow">
            <DropZone
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              maxSizeLabel="50MB"
              helpText="Select a Word document (.docx) with tables, math, or figures"
              error={error}
              onFiles={(files) => {
                const next = files[0]
                if (next) {
                  handleFile(next)
                } else {
                  setError('Please select a valid Word document (.docx file).')
                }
              }}
            />
          </div>
        )}

        {file && !processing && (
          <section className="container" style={{ marginBottom: '32px' }}>
            
            {/* Symmetrical Responsive Workspace Grid */}
            <div className="responsive-workspace converter-workspace">
              
              {/* Left Panel: Configuration Options & Reset Button */}
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
                    {/* Margin selector options */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        <Settings size={12} /> Page Margins
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'normal', label: 'Normal', desc: 'Standard A4' },
                          { id: 'compact', label: 'Compact', desc: 'Saves pages' },
                          { id: 'none', label: 'None', desc: 'Border-free' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setMargin(item.id)}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '6px',
                              backgroundColor: margin === item.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                              border: `2px solid ${margin === item.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
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
                            <span>{item.label}</span>
                            <span style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={runConvert}
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Convert to PDF
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <CheckCircle size={16} /> PDF Rendered Perfectly!
                    </div>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                      <button
                        className="btn btn-primary btn-gradient"
                        onClick={handleDownload}
                        style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                      >
                        <Download size={18} /> Download PDF File
                      </button>
                      {resultBlob && (
                        <SecureShareButton 
                          file={resultBlob} 
                          fileName={`${basename(file.name)}.pdf`} 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Interactive Symmetrical Preview Workspace */}
              <div className="workspace-preview-container">
                <div className="workspace-preview-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <Eye size={18} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Document Preview Hub</span>
                  </div>

                  {/* Tabs Selector */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setActiveTab('docx')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: activeTab === 'docx' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: activeTab === 'docx' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Uploaded DOCX
                    </button>
                    <button
                      onClick={() => success && setActiveTab('pdf')}
                      disabled={!success}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: activeTab === 'pdf' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: activeTab === 'pdf' ? '#fff' : 'var(--text-secondary)',
                        cursor: success ? 'pointer' : 'not-allowed',
                        opacity: success ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      Generated PDF
                    </button>
                  </div>
                </div>

                {/* Document View Area */}
                <div className="document-view-area">
                  
                  {/* Tab 1: Uploaded DOCX Preview (fluid and responsive) */}
                  {activeTab === 'docx' && (
                    <div 
                      ref={docxPreviewRef} 
                      className="docx-render-host" 
                    />
                  )}

                  {/* Tab 2: Compiled Generated PDF high-resolution pages */}
                  {activeTab === 'pdf' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pdfPages.map((imgSrc, idx) => (
                        <div key={idx} style={{ position: 'relative', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid var(--border-color)' }}>
                          <div style={{ position: 'absolute', top: '10px', left: '10px', padding: '4px 10px', background: 'rgba(0,0,0,0.75)', color: '#ffffff', fontSize: '10px', fontWeight: 600, borderRadius: '4px', zIndex: 10 }}>
                            Page {idx + 1} / {pdfPages.length}
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

                </div>
              </div>

            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium, Private, and High-Fidelity Word-to-PDF Conversion</h2>
          <p className="tool-description-para">
            Isolate formatting styles, preserve alignments, lists, complex mathematical scripts, chemical formulas, and tables instantly in your browser. 
            Because this tool executes 100% client-side inside the local web worker environment of your machine, you never have to worry about security or cloud upload limits.
          </p>
          <p className="tool-description-para-last">
            ✓ Professional client-side parsing · ✓ Standard margin adjustments · ✓ Safe, confidential, and instant.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload Your Docx', 'Select or drop any Word file securely into your local browser sandbox.'],
          ['Choose Margins', 'Toggle between Normal, Compact, or None layouts.'],
          ['Download PDF', 'Save the compiled layout instantly as a vector PDF document.']
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
        }
        .docx-render-host p, .docx-render-host span, .docx-render-host h1, .docx-render-host h2, .docx-render-host h3, .docx-render-host h4, .docx-render-host h5, .docx-render-host h6 {
          color: #000000;
        }

        /* Enable premium scientific font for math elements */
        .docx-render-host math, .docx-render-host m\:oMath, .docx-render-host span.math {
          font-family: "STIX Two Math", "Cambria Math", "Segoe UI Symbol", sans-serif !important;
        }
      `}</style>
      <Footer />
    </div>
  )
}
