import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { useBlobUrl } from '../../utils/useBlobUrl'

export default function DropZone({
  accept,
  multiple = false,
  maxSizeLabel = '50MB',
  helpText,
  onFiles,
  previewFile,
  error,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const previewUrl = useBlobUrl(previewFile)

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return
    onFiles(Array.from(fileList))
  }

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
    >
      {previewUrl ? (
        <img className="drop-preview" src={previewUrl} alt="Selected preview" />
      ) : (
        <UploadCloud size={46} />
      )}
      <strong>Drop files here or tap to browse</strong>
      <span>{helpText}</span>
      <small>Accepted: {accept || 'any'}{maxSizeLabel ? ` · Limit: ${maxSizeLabel}` : ''}</small>
      {error && <p className="error-message">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  )
}
