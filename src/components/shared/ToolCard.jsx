import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function ToolCard({ href, icon, title, description, badge, formats }) {
  const live = badge === 'Live' || badge === 'New'
  const content = (
    <>
      <div className="tool-card-top">
        <span className="tool-icon">{icon}</span>
        <span className={`status-badge ${live ? 'live' : 'soon'}`}>{badge}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="tool-card-bottom">
        <span>{formats}</span>
        {live && <ArrowRight size={18} />}
      </div>
    </>
  )

  if (!live) {
    return <article className="tool-card muted" aria-disabled="true">{content}</article>
  }

  return (
    <Link className="tool-card" to={href}>
      {content}
    </Link>
  )
}
