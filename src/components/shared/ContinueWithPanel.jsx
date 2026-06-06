import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { ArrowRight, ChevronDown, ChevronUp, Wifi } from 'lucide-react'
import { useWorkflow } from '../../context/WorkflowContext'
import { useShare } from '../../context/ShareContext'
import { useNetworkStatus } from '../../utils/useNetworkStatus'
import { getContinueOptions, normalizeFileList } from '../../utils/workflowEngine'

async function zipFilesForShare(files) {
  const zip = new JSZip()
  files.forEach((file) => zip.file(file.name, file))
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'fileora-files.zip', { type: 'application/zip' })
}

export default function ContinueWithPanel({
  sourceToolId,
  file,
  files,
  disabled = false,
  className = '',
}) {
  const [expanded, setExpanded] = useState(false)
  const [sharing, setSharing] = useState(false)
  const navigate = useNavigate()
  const { startHandoff } = useWorkflow()
  const { setFileToShare } = useShare()
  const isOnline = useNetworkStatus()

  const fileList = normalizeFileList(file, files)
  const isMulti = fileList.length > 1
  const primaryFile = fileList[0] || null
  const options = getContinueOptions(sourceToolId, primaryFile, isOnline, fileList)

  if (disabled || fileList.length === 0 || options.length === 0) return null

  const resolveHandoffPayload = (target) => {
    const useFirstOnly = isMulti && target.multiMode === 'first-only'
    if (useFirstOnly) {
      return { file: primaryFile, files: null }
    }
    if (isMulti) {
      return { file: null, files: fileList }
    }
    return { file: primaryFile, files: null }
  }

  const handleContinue = async (target) => {
    if (target.id === 'share') {
      if (!isOnline || sharing) return
      setSharing(true)
      try {
        const shareFile = isMulti
          ? await zipFilesForShare(fileList)
          : primaryFile
        if (!shareFile) return
        setFileToShare(shareFile)
        startHandoff({
          file: shareFile,
          sourceToolId,
          targetToolId: 'share',
        })
        navigate('/share')
      } finally {
        setSharing(false)
      }
      return
    }

    const payload = resolveHandoffPayload(target)
    startHandoff({
      ...payload,
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
            {isMulti
              ? `All ${fileList.length} files stay in this browser — no re-upload. Pick the next step:`
              : 'Your file stays in this browser — no re-upload. Pick the next step:'}
          </p>
          <div className="continue-with-grid">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="continue-with-chip"
                onClick={() => handleContinue(opt)}
                disabled={opt.disabled || (opt.id === 'share' && sharing)}
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