import { useState, useCallback } from 'react'
import { useWorkflowHandoff } from '../hooks/useWorkflowHandoff'
import { WorkflowHandoffNotice } from '../components/shared/ContinueWithPanel'
import { Helmet } from 'react-helmet-async'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import ImageToPdfLanding from '../components/image-to-pdf/ImageToPdfLanding'
import ImageToPdfWorkspace from '../components/image-to-pdf/ImageToPdfWorkspace'

const faqs = [
  { q: 'Can I combine multiple images into one PDF?', a: 'Yes. Upload multiple images and they will be combined into a single PDF in your chosen order.' },
  { q: 'What image formats can I convert to PDF?', a: 'JPG, JPEG, PNG, and WebP.' },
  { q: 'Can I choose the PDF page size?', a: 'Yes. Choose A4, Letter, or fit page to image size.' },
  { q: 'Is the PDF quality good?', a: 'Yes. Images are embedded at full resolution in the PDF.' },
  { q: 'Can I reorder images before converting?', a: 'Yes. Drag and drop to reorder before generating the PDF.' },
]

export default function ImageToPdf() {
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
  const { handoffNotice, clearHandoffNotice } = useWorkflowHandoff('image-to-pdf', {
    onFile: onHandoffFile,
    onFiles: onHandoffFiles,
  })
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }
  const appSchema = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Fileora Image to PDF Converter', url: 'https://fileora.tech/image-to-pdf', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Free Image to PDF Converter Online | Fileora</title>
        <meta name="description" content="Convert JPG and PNG images to PDF free. Combine multiple images into one PDF. Browser-based, no signup." />
        <link rel="canonical" href="https://fileora.tech/image-to-pdf" data-rh="true" />
        <meta property="og:title" content="Free Image to PDF Converter Online | Fileora" />
        <meta property="og:description" content="Convert JPG and PNG images to PDF free. Combine multiple images into one PDF. Browser-based, no signup." />
        <meta property="og:url" content="https://fileora.tech/image-to-pdf" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free Image to PDF Converter Online | Fileora" />
        <meta name="twitter:description" content="Convert JPG and PNG images to PDF free. Combine multiple images into one PDF. Browser-based, no signup." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Free Image to PDF Converter Online</h1>
          <p>Turn JPG, PNG and WebP images into a single PDF with page size and margin controls. Absolutely private execution in your browser.</p>
        </section>
        <WorkflowHandoffNotice message={handoffNotice} onDismiss={clearHandoffNotice} />
        {files.length ? <ImageToPdfWorkspace files={files} setFiles={setFiles} onReset={() => setFiles([])} /> : <ImageToPdfLanding error={error} onFiles={(nextFiles) => {
          const supported = ['image/jpeg', 'image/png', 'image/webp']
          const accepted = nextFiles.filter((next) => supported.includes(next.type) && next.size <= 50 * 1024 * 1024)
          if (!accepted.length) {
            setError('Please choose JPG, PNG or WebP images up to 50MB each.')
            return
          }
          setError('')
          setFiles(accepted)
        }} />}

        <section className="container tool-description-section">
          <h2>Convert JPG, PNG & WebP to PDF</h2>
          <p className="tool-description-para">
            Transform your standard images and photos into standardized PDF documents. Ideal for school assignments, 
            government registration forms, and corporate reports. Since we use pure Javascript client-side compilation, 
            your files are never transmitted to any third-party server, ensuring complete confidentiality.
          </p>
          <p className="tool-description-para-last">
            ✓ Custom page sizes (A4, Letter, Fit Image) · ✓ Margin settings (None, Small, Large) · ✓ Drag and drop reordering of images.
          </p>
        </section>

        <HowItWorks steps={[['Upload images', 'Add one or more JPG, PNG or WebP files.'], ['Set PDF layout', 'Choose page size, orientation, margins and order.'], ['Generate PDF', 'Download one PDF created in your browser.']]} />
        <FaqSection faqs={faqs} />

        <section className="container related-tools-section">
          <h3 className="related-tools-title">Related Tools</h3>
          <div className="related-tools-links">
            <a href="/png-to-pdf" className="btn btn-secondary btn-related">PNG to PDF</a>
            <a href="/merge-pdf" className="btn btn-secondary btn-related">Merge PDF</a>
            <a href="/compress-pdf" className="btn btn-secondary btn-related">PDF Compressor</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
