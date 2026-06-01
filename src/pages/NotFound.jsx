import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'

export default function NotFound() {
  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Page Not Found (404) | Fileora</title>
        <meta name="description" content="The page you are looking for does not exist on Fileora. Browse our free browser-based local file tools instead." />
        <meta name="robots" content="noindex, follow" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Page Not Found (404) | Fileora" />
        <meta name="twitter:description" content="The page you are looking for does not exist on Fileora. Browse our free browser-based local file tools instead." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <span style={{ fontSize: '6rem', fontWeight: 800, background: 'linear-gradient(135deg, #10B981, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block', lineHeight: 1 }}>
            404
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px', marginBottom: '12px' }}>
            Page Not Found
          </h1>
          <h2 style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 400, lineHeight: 1.6, marginTop: '0px', marginBottom: '32px' }}>
            We couldn't find the page you are looking for. Fileora processes all files locally inside your browser sandbox. Explore our offline PDF, image, and video utilities instead.
          </h2>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary btn-gradient" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Home size={16} /> Return Home
            </Link>
            <a href="/#tools" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> View All Tools
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
