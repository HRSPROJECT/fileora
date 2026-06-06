import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="container hero-inner">
        <p className="eyebrow">Fileora for file work that stays yours</p>
        <h1>Fileora — Secure Browser Tools for PDF, Image &amp; Video Files</h1>
        <p className="hero-copy">
          Professional-grade tools that run entirely in your browser. Chain steps with <strong>Continue with</strong> — compress an image, then jump to PDF, resize, or share without re-uploading. Offline-ready processing, no signup, no limits. P2P Share is the only tool that needs network access to pair two devices.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/compress">
            Compress Image <ArrowRight size={18} />
          </Link>
          <a className="btn btn-secondary" href="#tools">
            View All Tools <ChevronDown size={18} />
          </a>
        </div>
        
        {/* Product Hunt Featured Badge */}
        <div className="hero-badge-container">
          <a 
            href="https://www.producthunt.com/products/fileora-free-online-file-tools?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-fileora-free-online-file-tools" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hero-badge-link"
          >
            <img 
              src="/product-hunt-badge.svg" 
              alt="Fileora — Free Online File Tools - Free file tools that run entirely in your browser  | Product Hunt" 
              width="250" 
              height="54" 
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>
    </section>
  )
}
