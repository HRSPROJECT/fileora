import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clean up statically prerendered head tags to prevent React 19 client-side duplication
if (typeof document !== 'undefined') {
  const selectors = [
    'head title',
    'head link[rel="canonical"]',
    'head meta[name="description"]',
    'head meta[property^="og:"]',
    'head meta[name^="twitter:"]',
  ]
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove())
  })
}

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Production prerender leaves .app-shell in #root — hydrate instead of wiping (avoids logo/splash flash)
const isPrerendered = container?.querySelector('.app-shell') != null

if (isPrerendered) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}

if (!document.documentElement.classList.contains('app-ready')) {
  document.documentElement.classList.add('app-ready')
}