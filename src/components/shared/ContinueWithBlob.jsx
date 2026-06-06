import { useMemo } from 'react'
import ContinueWithPanel from './ContinueWithPanel'
import { blobToHandoffFile } from '../../utils/workflowEngine'

export default function ContinueWithBlob({
  sourceToolId,
  blob,
  fileName,
  mimeType,
  disabled = false,
  files,
  className = '',
}) {
  const file = useMemo(() => {
    if (!blob) return null
    return blobToHandoffFile(blob, fileName, mimeType || blob.type)
  }, [blob, fileName, mimeType])

  return (
    <ContinueWithPanel
      sourceToolId={sourceToolId}
      file={file}
      files={files}
      disabled={disabled || !file}
      className={className}
    />
  )
}