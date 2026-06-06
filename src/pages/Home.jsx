import { Helmet } from 'react-helmet-async'
import { Cpu, ShieldCheck, Zap } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import HeroSection from '../components/home/HeroSection'
import TrustBar from '../components/home/TrustBar'
import ToolsGrid from '../components/home/ToolsGrid'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'

const faqs = [
  { q: 'Are my files safe on Fileora?', a: 'Yes. All processing happens in your browser. Files never leave your device.' },
  { q: 'Is Fileora completely free?', a: 'Yes. No signup, no subscription, no hidden limits. All tools are free forever.' },
  { q: 'Does Fileora work on mobile?', a: 'Yes. Fileora is fully optimised for mobile browsers on Android and iOS.' },
  { q: 'Do I need to install anything?', a: 'No. Everything runs in your browser. No software to install.' },
  { q: 'What file formats does Fileora support?', a: 'JPEG, PNG, WebP, AVIF for images. PDF for document tools. More formats coming soon.' },
  { q: 'How does local processing work?', a: "Fileora uses modern web technologies like WebAssembly, HTML5 APIs, and client-side JavaScript. Instead of sending your PDF or image files to a cloud server where they could be logged or stored, your browser processes them locally using your computer's own CPU. Once processing is complete, the file is saved directly to your Downloads folder without ever crossing the internet." },
  { q: 'Is there a limit on file size or the number of conversions?', a: 'No, there are absolutely no file size limits or daily conversion thresholds on Fileora. Because we do not upload files to remote servers, we do not incur heavy bandwidth or cloud compute costs. This allows us to offer completely unlimited document compression, resizing, conversion, scanning, and editing tools to our users free of charge, forever.' },
  { q: 'Why is Fileora a better alternative to cloud-based PDF tools?', a: 'Cloud-based tools like iLovePDF, Smallpdf, or CamScanner require uploading your private files to their external servers. This poses significant privacy, data compliance, and security risks, especially for sensitive legal, financial, or personal documents. Fileora processes files inside your browser sandbox, meaning your data never leaves your physical device during compression, conversion, or editing. It is also faster since you do not have to wait for uploads or downloads.' },
  { q: 'Can I use Fileora without an active internet connection?', a: "Yes — for almost every tool. Once Fileora is loaded in your browser, you can compress images, convert formats, split or merge PDFs, scan documents, and process video offline. The only exception is P2P Share, which needs an internet connection to connect two devices. Your file still transfers directly between browsers and is never uploaded to Fileora." },
  { q: 'Does P2P Share work offline?', a: 'No. P2P Share needs an active internet connection (Wi‑Fi or mobile data) so two browsers can find each other. File content still streams device-to-device and is never stored on Fileora servers. All other tools work offline after the first page load.' },
  { q: 'Does Fileora store or look at my metadata?', a: 'No. We have a strict zero-data-collection policy. Fileora does not log your files, capture document metadata, or track your personal information. Everything is kept inside your browser session. Processing tools do not upload your files. P2P Share only uses the network to pair devices — not to store file content.' },
  { q: 'What is Continue with?', a: 'After any tool finishes, click Continue with to open sensible next steps for that file type. For example, after compressing an image you can jump to Image to PDF, Resizer, Converter, Scanner, or P2P Share. After merging a PDF you see PDF tools like Compress, Split, Protect, or Sign. Your output stays in the browser — no re-upload.' }
]

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Fileora',
  url: 'https://fileora.tech',
  logo: 'https://fileora.tech/favicon.svg',
  description: 'Privacy-first browser-based document, image, and video tools. Process files locally offline — P2P Share is the only online pairing feature.',
  knowsAbout: [
    'PDF compression',
    'image optimization',
    'document scanning',
    'privacy-first utilities'
  ]
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Fileora',
  url: 'https://fileora.tech',
  description: 'Free browser-based file tools. Privacy-first, no signup.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://fileora.tech/compress?q={search_term_string}',
    'query-input': 'required name=search_term_string'
  }
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Fileora',
  url: 'https://fileora.tech',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127'
  }
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function Home() {
  return (
    <div className="app-shell">
      <Helmet>
        <title>Fileora - Browser Tools for PDF, Video, JPG, PNG Files</title>
        <meta name="description" content="Free private browser tools by Fileora. Convert &amp; compress PDF, JPG, PNG images or edit MP4, MOV, WebM video files locally in your browser without uploading." />
        <link rel="canonical" href="https://fileora.tech/" data-rh="true" />
        <meta property="og:title" content="Fileora - Browser Tools for PDF, Video, JPG, PNG Files" />
        <meta property="og:description" content="Free private browser tools by Fileora. Convert &amp; compress PDF, JPG, PNG images or edit MP4, MOV, WebM video files locally in your browser without uploading." />
        <meta property="og:url" content="https://fileora.tech/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Fileora - Browser Tools for PDF, Video, JPG, PNG Files" />
        <meta name="twitter:description" content="Free private browser tools by Fileora. Convert &amp; compress PDF, JPG, PNG images or edit MP4, MOV, WebM video files locally in your browser without uploading." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <Navbar />
      <main>
        <HeroSection />
        <TrustBar />
        <ToolsGrid id="tools" />
        <HowItWorks steps={[
          ['Drop your file', 'Choose a file from your device or drag it into any tool workspace.'],
          ['Process locally in your browser', 'Fileora uses WebAssembly and client-side APIs. Your file never uploads to our servers.'],
          ['Download or continue', 'Save the result, or tap Continue with to open the next tool with your output already loaded.'],
        ]} />
        
        {/* Technical Architecture Deep-dive Section */}
        <section className="tech-section">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Technical Architecture</p>
              <h2>Private, sandboxed, and near-native local performance</h2>
              <p>Under the hood of the browser engines powering your offline-first workflow — except P2P Share, which needs internet to pair devices.</p>
            </div>
            
            <div className="tech-grid">
              <div className="tech-card animate-fade-in">
                <div className="tech-icon-wrap">
                  <Cpu size={24} />
                </div>
                <h3>WebAssembly Engine</h3>
                <p>
                  We compile high-performance C++ and Rust libraries directly into sandboxed WebAssembly (Wasm) bytecode. This allows heavy document operations like PDF encryption, image compression, and character recognition to execute locally at <strong>near-native CPU speeds</strong> inside your browser.
                </p>
              </div>

              <div className="tech-card animate-fade-in">
                <div className="tech-icon-wrap">
                  <Zap size={24} />
                </div>
                <h3>Zero Upload Latency</h3>
                <p>
                  Traditional file tools waste precious time uploading multi-megabyte files to a distant cloud server and then waiting to download the completed result. Fileora reads your files directly from your physical drive into browser memory, delivering <strong>instantaneous, lag-free processing</strong>.
                </p>
              </div>

              <div className="tech-card animate-fade-in">
                <div className="tech-icon-wrap">
                  <ShieldCheck size={24} />
                </div>
                <h3>In-Browser Sandboxing</h3>
                <p>
                  Every operation runs inside your browser's native security sandbox. Processing tools eliminate file uploads, so your documents avoid cloud logging. P2P Share uses the network only to pair two browsers — never to store file content. Once you close the tab, <strong>all loaded document memory is immediately freed</strong>.
                </p>
              </div>
            </div>

            {/* Sovereign Data Privacy Section */}
            <div className="security-compliance-box">
              <h3>Sovereign Data Privacy & Regulatory Compliance</h3>
              <p>
                Because Fileora executes 100% client-side, we possess zero access to your files, documents, metadata, or personal identities. This architectural design makes our toolkit immediately <strong>compliant with strict international data residency regulations</strong>.
              </p>
              <div className="compliance-grid">
                <div className="compliance-item">
                  <ShieldCheck size={20} />
                  <span>GDPR Aligned</span>
                </div>
                <div className="compliance-item">
                  <ShieldCheck size={20} />
                  <span>HIPAA Compliant</span>
                </div>
                <div className="compliance-item">
                  <ShieldCheck size={20} />
                  <span>CCPA Protected</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FaqSection faqs={faqs} />
      </main>
      <Footer />
    </div>
  )
}
