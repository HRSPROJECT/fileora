import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, ChevronUp, Wifi } from 'lucide-react'
import { useWorkflow } from '../../context/WorkflowContext'
import { useShare } from '../../context/ShareContext'
import { useNetworkStatus } from '../../utils/useNetworkStatus'
import { getContinueOptions } from '../../utils/workflowEngine'

export default function ContinueWithPanel({
  sourceToolId,
  file,
  files,
  disabled = false,
  className = '',
}) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const { startHandoff } = useWorkflow()
  const { setFileToShare } = useShare()
  const isOnline = useNetworkStatus()

  const handoffFile = file || (files?.length === 1 ? files[0] : null)
  const options = getContinueOptions(sourceToolId, handoffFile, isOnline)

  if (disabled || options.length === 0) return null

  const handleContinue = (target) => {
    if (target.id === 'share') {
      const shareFile = handoffFile || files?.[0]
      if (!shareFile) return
      if (!isOnline) return
      setFileToShare(shareFile)
      startHandoff({
        file: shareFile,
        sourceToolId,
        targetToolId: 'share',
      })
      navigate('/share')
      return
    }

    startHandoff({
      file: handoffFile,
      files: files?.length > 1 ? files : null,
      sourceToolId,
      targetToolId: target.id,
    })
    navigate(target.route)
  }

  return (
    <div className={`continue-with-panel ${className}`.trim()}>
      <button
        type="button"
        className="continue-with-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="continue-with-toggle-label">
          <ArrowRight size={18} />
          Continue with another tool
        </span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div className="continue-with-options">
          <p className="continue-with-hint">
            Your file stays in this browser — no re-upload. Pick the next step:
          </p>
          <div className="continue-with-grid">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="continue-with-chip"
                onClick={() => handleContinue(opt)}
                disabled={opt.disabled}
                title={opt.hint || opt.title}
              >
                <span>{opt.title}</span>
                {opt.needsNetwork && (
                  <span className="continue-with-chip-badge">
                    <Wifi size={12} /> Wi‑Fi
                  </span>
                )}
              </button>
            ))}
          </div>
          {files?.length > 1 && (
            <p className="continue-with-note">
              Continuing with the active / first file. Download ZIP for all images.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function WorkflowHandoffNotice({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="workflow-handoff-notice" role="status">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="workflow-handoff-dismiss" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  )
}