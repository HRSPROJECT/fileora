import { useMemo } from 'react'
import ContinueWithPanel from './ContinueWithPanel'
import { blobToHandoffFile } from '../../utils/workflowEngine'

export default function ContinueWithBlob({
  sourceToolId,
  blob,
  fileName,
  mimeType,
  disabled = false,
  files: fileEntries,
  restoreFile,
  restoreFiles,
  restoreSnapshot,
  className = '',
}) {
  const handoffFiles = useMemo(() => {
    if (fileEntries?.length) {
      return fileEntries
        .map((entry) => {
          if (entry instanceof File) return entry
          if (entry?.blob) {
            return blobToHandoffFile(entry.blob, entry.fileName || entry.name, entry.mimeType || entry.blob.type)
          }
          return null
        })
        .filter(Boolean)
    }
    if (!blob) return []
    return [blobToHandoffFile(blob, fileName, mimeType || blob.type)]
  }, [blob, fileName, mimeType, fileEntries])

  const singleFile = handoffFiles.length === 1 ? handoffFiles[0] : null
  const multiFiles = handoffFiles.length > 1 ? handoffFiles : null

  return (
    <ContinueWithPanel
      sourceToolId={sourceToolId}
      file={singleFile}
      files={multiFiles}
      restoreFile={restoreFile}
      restoreFiles={restoreFiles}
      restoreSnapshot={restoreSnapshot}
      disabled={disabled || handoffFiles.length === 0}
      className={className}
    />
  )
}