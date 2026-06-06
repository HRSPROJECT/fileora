import { createElement } from 'react'
import { ArrowRight, Lock, Smartphone, Sparkles, WifiOff, Zap } from 'lucide-react'

export default function TrustBar() {
  const items = [
    { icon: Lock, label: 'Files never uploaded' },
    { icon: WifiOff, label: 'Offline-ready tools' },
    { icon: ArrowRight, label: 'Continue with workflows' },
    { icon: Zap, label: 'WebAssembly powered' },
    { icon: Sparkles, label: 'Free forever' },
    { icon: Smartphone, label: 'Works on mobile' },
  ]

  return (
    <section className="container trust-grid" aria-label="Fileora privacy and speed benefits">
      {items.map(({ icon, label }) => (
        <div key={label} className="trust-item">
          {createElement(icon, { size: 18 })}
          <span>{label}</span>
        </div>
      ))}
    </section>
  )
}
