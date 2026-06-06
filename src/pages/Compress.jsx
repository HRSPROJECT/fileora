import { useState, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import { Helmet } from 'react-helmet-async'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import LandingPage from '../components/compress/LandingPage'
import Workspace from '../components/compress/Workspace'

const faqs = [
  { q: 'How much can I compress an image?', a: 'Up to 90% size reduction depending on format and quality settings.' },
  { q: 'Will compression reduce image quality?', a: 'Our smart compression minimizes visible quality loss. Use the comparison slider to see the difference.' },
  { q: 'Can I compress images for WhatsApp?', a: 'Yes. Compress below 1MB for best WhatsApp quality.' },
  { q: 'What formats are supported?', a: 'JPEG, PNG, WebP, and AVIF up to 50MB.' },
  { q: 'Is there a limit on how many images I can compress?', a: 'No limits. Compress as many as you want, completely free.' },
]

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Fileora Image Compressor',
  url: 'https://fileora.tech/compress',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
}

export default function Compress() {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')

  const onHandoffFile = useCallback((file) => {
    setFiles([file])
    setError('')
  }, [])
  const onHandoffFiles = useCallback((nextFiles) => {
    setFiles(nextFiles)
    setError('')
  }, [])
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('compress', {
    onFile: onHandoffFile,
    onFiles: onHandoffFiles,
  })

  const addFiles = (newFiles) => {
    const accepted = newFiles.filter((file) => file.type.startsWith('image/') && file.size <= 50 * 1024 * 1024)
    setError(accepted.length ? '' : 'Please choose JPEG, PNG, WebP or AVIF images up to 50MB each.')
    setFiles((current) => [...current, ...accepted])
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Free Image Compressor Online — JPEG PNG WebP | Fileora</title>
        <meta name="description" content="Compress JPEG, PNG, WebP and AVIF images online for free. Reduce file size up to 90% without losing quality. No signup, browser-based." />
        <link rel="canonical" href="https://fileora.tech/compress" data-rh="true" />
        <meta property="og:title" content="Free Image Compressor Online — JPEG PNG WebP | Fileora" />
        <meta property="og:description" content="Compress JPEG, PNG, WebP and AVIF images online for free. Reduce file size up to 90% without losing quality. No signup, browser-based." />
        <meta property="og:url" content="https://fileora.tech/compress" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free Image Compressor Online — JPEG PNG WebP | Fileora" />
        <meta name="twitter:description" content="Compress JPEG, PNG, WebP and AVIF images online for free. Reduce file size up to 90% without losing quality. No signup, browser-based." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Image Compressor Online</h1>
          <p>Compress JPEG, PNG, WebP and AVIF images locally with quality controls and a before-after preview. File size reduces up to 90% in seconds without leaving your browser.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />
        {files.length > 0 ? <Workspace files={files} setFiles={setFiles} onReset={() => setFiles([])} /> : <LandingPage onFileSelect={addFiles} error={error} />}
        
        <section className="container tool-description-section">
          <h2>Compress Images for WhatsApp, Instagram & Email</h2>
          <p className="tool-description-para">
            Reduce image size for WhatsApp sharing, email attachments, Instagram uploads, and website optimization. 
            By compressing JPEG, PNG, WebP, and AVIF images, you can bypass platform limitations and speed up web loads 
            without compromising visual clarity.
          </p>
          <p className="tool-description-para-last">
            ✓ Target optimal mobile sizes (under 1MB for WhatsApp) · ✓ Convert formats during compression · ✓ Batch process multiple photos simultaneously in your browser.
          </p>
        </section>

        <HowItWorks steps={[
          ['Drop your images', 'Upload one image or a batch of images up to 50MB each.'],
          ['Tune quality and format', 'Choose WebP, JPEG or PNG and preview the result instantly.'],
          ['Download compressed files', 'Save each optimized image without anything leaving your device.'],
        ]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related Tools</h3>
          <div className="related-tools-links">
            <a href="/resize" className="btn btn-secondary btn-related">Image Resizer</a>
            <a href="/convert" className="btn btn-secondary btn-related">Image Converter</a>
            <a href="/image-to-pdf" className="btn btn-secondary btn-related">Image to PDF</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
