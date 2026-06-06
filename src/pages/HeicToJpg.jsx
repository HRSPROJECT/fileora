import { useState, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import ContinueWithBlob from '../components/shared/ContinueWithBlob'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useShare } from '../context/ShareContext'
import { FileImage, ArrowLeft, Shield, Download, Sparkles, FolderSync, Settings, Check, Share2 } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import JSZip from 'jszip'
import heic2any from 'heic2any'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'

const faqs = [
  { q: 'What is HEIC and why do I need to convert it?', a: 'HEIC (High Efficiency Image Container) is the default image format used by Apple on iPhones and iPads. While efficient, it is not widely supported on Windows, Android, or many websites. Converting HEIC to JPG or PNG makes your photos compatible anywhere.' },
  { q: 'Is it safe to convert my personal HEIC photos on Fileora?', a: 'Completely safe. Unlike online converters that upload your photos to cloud servers, Fileora performs all conversions locally on your computer. Your photos never leave your device.' },
  { q: 'Can I batch convert multiple HEIC files at once?', a: 'Yes. You can drag and drop multiple HEIC images at once, customize the format and quality, and download them all as a single organized ZIP file.' },
  { q: 'Will I lose image quality during the conversion?', a: 'Minimal to none. By adjusting our premium quality slider to 90% or higher, the output will look identical to your original HEIC capture while enjoying universal compatibility.' }
]

export default function HeicToJpg() {
  const navigate = useNavigate()
  const { setFileToShare } = useShare()
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [format, setFormat] = useState('jpeg') // 'jpeg', 'png', 'webp'
  const [quality, setQuality] = useState(90)
  const [processing, setProcessing] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [results, setResults] = useState([]) // array of { name, blob, dataUrl, size }

  const onHandoffFile = useCallback((nextFile) => {
    setFiles([nextFile])
    setError('')
    setResults([])
  }, [])
  const onHandoffFiles = useCallback((nextFiles) => {
    setFiles(nextFiles)
    setError('')
    setResults([])
  }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('heic-to-jpg', {
    onFile: onHandoffFile,
    onFiles: onHandoffFiles,
  })

  const runConvert = async () => {
    if (!files.length) return
    setProcessing(true)
    setError('')
    setProgressPercent(0)
    setResults([])

    const converted = []
    const mimeMap = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp'
    }

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        setProgressText(`Converting ${file.name}...`)
        setProgressPercent(Math.round((index / files.length) * 100))

        // heic2any expects a blob or array of blobs.
        // It converts HEIC to standard image blob.
        const targetType = mimeMap[format]
        const convertedBlob = await heic2any({
          blob: file,
          toType: targetType,
          quality: format === 'png' ? 1.0 : quality / 100
        })

        // heic2any can return an array if heic is a container with multiple images, check for array
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
        const outputExt = format === 'jpeg' ? 'jpg' : format

        converted.push({
          name: `${basename(file.name)}.${outputExt}`,
          blob: finalBlob,
          dataUrl: URL.createObjectURL(finalBlob),
          size: finalBlob.size
        })
      }

      setResults(converted)
      setProgressPercent(100)
      setProgressText('All conversions successfully completed!')
    } catch (err) {
      console.error(err)
      setError('Conversion failed. Make sure you uploaded valid HEIC/HEIF files. iOS HEIC format is fully supported.')
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
    setProgressText('Bundling converted photos into a single ZIP...')
    try {
      const zip = new JSZip()
      results.forEach((res) => {
        zip.file(res.name, res.blob)
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, 'fileora-heic-converted.zip')
    } catch (err) {
      console.error(err)
      setError('Could not package ZIP folder.')
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
        finalName = 'fileora-heic-converted.zip'
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

  const handleReset = () => {
    results.forEach((res) => URL.revokeObjectURL(res.dataUrl))
    setFiles([])
    setResults([])
    setError('')
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora HEIC to JPG Converter',
    url: 'https://fileora.tech/heic-to-jpg',
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
        <title>Convert HEIC to JPG Online - 100% Free & Private | Fileora</title>
        <meta name="description" content="Convert iPhone HEIC photos to JPG, PNG, or WebP online for free. Support batch upload. 100% private local browser rendering. No signups." />
        <link rel="canonical" href="https://fileora.tech/heic-to-jpg" data-rh="true" />
        <meta property="og:title" content="Convert HEIC to JPG Online - 100% Free & Private | Fileora" />
        <meta property="og:description" content="Convert iPhone HEIC photos to JPG, PNG, or WebP online for free. Support batch upload. 100% private local browser rendering. No signups." />
        <meta property="og:url" content="https://fileora.tech/heic-to-jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Convert HEIC to JPG Online - 100% Free & Private | Fileora" />
        <meta name="twitter:description" content="Convert iPhone HEIC photos to JPG, PNG, or WebP online for free. Support batch upload. 100% private local browser rendering. No signups." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Convert HEIC to JPG Online</h1>
          <p>Instantly convert Apple HEIC photos to universally supported JPG, PNG, or WebP. Superfast, fully private batch conversions.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />

        {files.length === 0 ? (
          <div className="container container-narrow">
            <DropZone
              accept=".heic,.heif"
              multiple={true}
              maxSizeLabel="30MB"
              helpText="Select Apple HEIC/HEIF photo files"
              error={error}
              onFiles={(nextFiles) => {
                // heic files sometimes don't have file.type on windows/older platforms, filter by extension fallback
                const accepted = nextFiles.filter(
                  (next) => next.type.includes('heic') || next.type.includes('heif') || next.name.toLowerCase().endsWith('.heic') || next.name.toLowerCase().endsWith('.heif')
                )
                if (!accepted.length) {
                  setError('Please select valid HEIC or HEIF image files.')
                  return
                }
                setFiles(accepted)
              }}
            />
          </div>
        ) : (
          <section className="workspace-panel">
            {/* Left side preview grid */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '400px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Queue: {files.length} Photos
                </span>
              </div>

              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', alignContent: 'start' }}>
                {results.length > 0 ? (
                  results.map((res, i) => (
                    <div 
                      key={i} 
                      className="card animate-fade-in" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        padding: '10px', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ width: '100%', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <img 
                          src={res.dataUrl} 
                          alt={res.name} 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                      <span 
                        style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={res.name}
                      >
                        {res.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {formatBytes(res.size)}
                      </span>
                      <button
                        onClick={() => handleDownloadSingle(res)}
                        className="btn btn-primary"
                        style={{ marginTop: '8px', padding: '4px 8px', width: '100%', fontSize: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  ))
                ) : (
                  files.map((file, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '16px 12px', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        textAlign: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileImage size={32} style={{ color: 'var(--text-tertiary)' }} />
                      <span 
                        style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right side controls panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '14px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> Local conversion</div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Batch Converter Settings
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Photos: {files.length}</p>
              </div>

              {results.length === 0 ? (
                <>
                  {/* Select Format */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Convert to</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {['jpeg', 'png', 'webp'].map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setFormat(fmt)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '4px',
                            backgroundColor: format === fmt ? 'var(--bg-tertiary)' : 'transparent',
                            color: format === fmt ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: 'none',
                            fontSize: '12px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {fmt === 'jpeg' ? 'jpg' : fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  {format !== 'png' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Image Quality</label>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{quality}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
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
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Processing batch...</span>
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
                      style={{ width: '100%', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Sparkles size={16} /> Convert {files.length} Photos
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                    <Check size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    Conversion Succeeded!
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-gradient"
                      onClick={handleDownloadAll}
                      disabled={processing}
                      style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                    >
                      <Download size={18} /> {results.length === 1 ? 'Download Photo' : 'Download Photos (ZIP)'}
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
                    sourceToolId="heic-to-jpg"
                    fileEntries={results.map((res) => ({
                      blob: res.blob,
                      fileName: res.name,
                      mimeType: res.blob?.type,
                    }))}
                    disabled={results.length === 0 || processing}
                  />

                  <button
                    className="btn btn-ghost"
                    onClick={() => setResults([])}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  >
                    Adjust Quality & Re-convert
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Lossless Local iPhone HEIC Image Converter</h2>
          <p className="tool-description-para">
            Safely unlock HEIC files right in your web browser. Fileora renders your iOS pictures locally into beautiful, universally supported JPG formats. 
            Because your device performs 100% of the conversions, your private images never touch a server.
          </p>
          <p className="tool-description-para-last">
            ✓ Absolute image isolation · ✓ Bulk file drag and drop support · ✓ Premium format configurations.
          </p>
        </section>

        <HowItWorks steps={[
          ['Select HEIC Photos', 'Drag and drop one or more iOS HEIC photos.'],
          ['Choose Quality and Format', 'Tailor format (JPG/PNG/WebP) and compression presets.'],
          ['Instant ZIP Download', 'Fetch all universally compatible outputs in a structured folder instantly.']
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related Converters</h3>
          <div className="related-tools-links">
            <a href="/convert" className="btn btn-secondary btn-related">Image Converter</a>
            <a href="/compress" className="btn btn-secondary btn-related">Image Compressor</a>
            <a href="/image-to-pdf" className="btn btn-secondary btn-related">Image to PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
