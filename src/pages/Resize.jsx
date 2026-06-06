import { useState, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import { Helmet } from 'react-helmet-async'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import ResizeLanding from '../components/resize/ResizeLanding'
import ResizeWorkspace from '../components/resize/ResizeWorkspace'

const faqs = [
  { q: 'Can I resize without losing quality?', a: 'For enlarging, some quality loss is expected. For reducing, quality is fully preserved.' },
  { q: 'What is the WhatsApp image size?', a: 'WhatsApp profile pictures display at 192x192px. Our preset handles this automatically.' },
  { q: 'Can I resize to passport photo size?', a: 'Yes. Use the passport photo preset for standard 35x45mm size.' },
  { q: 'Does resizing change the file format?', a: 'No, unless you choose a different output format.' },
  { q: 'Is there a maximum file size?', a: 'Up to 50MB input file size.' },
]

export default function Resize() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')

  const onHandoffFile = useCallback((next) => {
    setFile(next)
    setError('')
  }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('resize', { onFile: onHandoffFile })
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }
  const appSchema = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Fileora Image Resizer', url: 'https://fileora.tech/resize', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Free Image Resizer Online — Resize JPG PNG WebP | Fileora</title>
        <meta name="description" content="Resize images online for free. Custom dimensions or WhatsApp, Instagram, passport photo presets. No signup, browser-based." />
        <link rel="canonical" href="https://fileora.tech/resize" data-rh="true" />
        <meta property="og:title" content="Free Image Resizer Online — Resize JPG PNG WebP | Fileora" />
        <meta property="og:description" content="Resize images online for free. Custom dimensions or WhatsApp, Instagram, passport photo presets. No signup, browser-based." />
        <meta property="og:url" content="https://fileora.tech/resize" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free Image Resizer Online — Resize JPG PNG WebP | Fileora" />
        <meta name="twitter:description" content="Resize images online for free. Custom dimensions or WhatsApp, Instagram, passport photo presets. No signup, browser-based." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Image Resizer Online</h1>
          <p>Resize images with custom dimensions, locked aspect ratio and ready-made social presets. Fast, browser-based resizing with no server upload.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />
        {file ? <ResizeWorkspace file={file} onReset={() => setFile(null)} /> : <ResizeLanding error={error} onFiles={(files) => {
          const next = files[0]
          if (!next || !['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 50 * 1024 * 1024) {
            setError('Please choose a JPG, PNG or WebP image up to 50MB.')
            return
          }
          setError('')
          setFile(next)
        }} />}

        <section className="container tool-description-section">
          <h2>Resize Images for WhatsApp, Instagram & Passport Photos</h2>
          <p className="tool-description-para">
            Resize photos to WhatsApp profile picture size (192x192px), Instagram post size (1080x1080px), 
            passport photo size (35x45mm), and custom dimensions. This tool operates strictly in your browser, 
            meaning your high-resolution photos are resized locally without ever leaving your device.
          </p>
          <p className="tool-description-para-last">
            ✓ Lock aspect ratio to prevent distorting details · ✓ Select common social media banner presets · ✓ High-fidelity browser rendering.
          </p>
        </section>

        <HowItWorks steps={[['Upload an image', 'Choose a JPG, PNG or WebP up to 50MB.'], ['Pick size or preset', 'Use exact dimensions or a common social profile preset.'], ['Download resized image', 'Export as JPG, PNG or WebP.']]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related Tools</h3>
          <div className="related-tools-links">
            <a href="/compress" className="btn btn-secondary btn-related">Image Compressor</a>
            <a href="/convert" className="btn btn-secondary btn-related">Image Converter</a>
            <a href="/image-to-pdf" className="btn btn-secondary btn-related">Image to PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
