import { useState, useEffect, useCallback } from 'react'
import { Download, GripVertical, FileText } from 'lucide-react'
import { downloadBlob, formatBytes } from '../../utils/imageUtils'
import { imagesToPdf } from '../../utils/pdfUtils'
import { useBlobUrl } from '../../utils/useBlobUrl'
import SecureShareButton from '../shared/SecureShareButton'
import ContinueWithBlob from '../shared/ContinueWithBlob'

export default function ImageToPdfWorkspace({ files, setFiles, onReset }) {
  const [pageSize, setPageSize] = useState('a4')
  const [orientation, setOrientation] = useState('portrait')
  const [margin, setMargin] = useState(24)
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const previewUrl = useBlobUrl(result)

  const generate = useCallback(async () => {
    setProcessing(true)
    setError('')
    try {
      const blob = await imagesToPdf(files, { pageSize, orientation, margin })
      setResult(blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }, [files, pageSize, orientation, margin])

  useEffect(() => {
    if (files.length === 0) return
    const id = setTimeout(() => {
      generate()
    }, 500)
    return () => clearTimeout(id)
  }, [files.length, generate])

  const move = (from, to) => {
    if (to < 0 || to >= files.length) return
    const next = [...files]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setFiles(next)
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {previewUrl ? (
          <iframe 
            src={previewUrl + '#toolbar=0'} 
            title="PDF Preview"
            style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={44} style={{ opacity: 0.5 }} />
          </div>
        )}
      </div>
      <div className="workspace-controls">
        <label>Files & Ordering</label>
        <div className="file-list-panel" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px' }}>
          {files.map((file, index) => (
            <div className="sortable-row" key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '4px' }}>
              <GripVertical size={18} style={{ cursor: 'grab', opacity: 0.5 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>{index + 1}. {file.name}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="mini-button" type="button" onClick={() => move(index, index - 1)} disabled={index === 0}>↑</button>
                <button className="mini-button" type="button" onClick={() => move(index, index + 1)} disabled={index === files.length - 1}>↓</button>
              </div>
            </div>
          ))}
        </div>
        <label>Page size
          <select className="input-select" value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
            <option value="fit">Fit to image</option>
          </select>
        </label>
        <label>Orientation
          <select className="input-select" value={orientation} onChange={(event) => setOrientation(event.target.value)}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
        <label>Margin: {margin}px
          <input className="slider" type="range" min="0" max="96" value={margin} onChange={(event) => setMargin(Number(event.target.value))} style={{ width: '100%' }} />
        </label>
        {error && <p className="error-message">{error}</p>}
        {result && (
          <div className="success-banner" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--success)', margin: '16px 0' }}>
            Ready: {formatBytes(result.size)} {processing && <span style={{ opacity: 0.5 }}>(Updating...)</span>}
          </div>
        )}
        <div className="action-row" style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ flex: 1, minWidth: '120px' }} type="button" onClick={onReset}>Choose another</button>
          <button className="btn btn-primary btn-gradient" style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(to right, #6EE7B7, #3B82F6)', color: '#000', fontWeight: 'bold' }} type="button" disabled={!result || processing} onClick={() => downloadBlob(result, 'fileora-images.pdf')}>
            <Download size={18} /> Download
          </button>
          {result && !processing && (
            <SecureShareButton 
              file={result} 
              fileName="fileora-images.pdf" 
              style={{ flex: 1, minWidth: '160px', padding: '14px' }}
            />
          )}
        </div>
        <ContinueWithBlob
          sourceToolId="image-to-pdf"
          blob={result}
          fileName="fileora-images.pdf"
          mimeType="application/pdf"
          disabled={!result || processing}
        />
      </div>
    </section>
  )
}
