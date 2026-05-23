import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="container hero-inner">
        <p className="eyebrow">Fileora for file work that stays yours</p>
        <h1>Your privacy-first file toolkit</h1>
        <p className="hero-copy">
          Professional-grade tools that run entirely in your browser. No signup, no uploads, no limits.
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
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1150733&theme=light&t=1779528462343" 
              alt="Fileora — Free Online File Tools - Free file tools that run entirely in your browser  | Product Hunt" 
              width="250" 
              height="54" 
            />
          </a>
        </div>
      </div>
    </section>
  )
}
