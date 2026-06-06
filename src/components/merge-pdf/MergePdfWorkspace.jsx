import { useEffect, useState, useCallback } from 'react'
import { Download, GripVertical, FileText } from 'lucide-react'
import { downloadBlob, formatBytes } from '../../utils/imageUtils'
import { countPdfPages, mergePdfFiles } from '../../utils/pdfUtils'
import { useBlobUrl } from '../../utils/useBlobUrl'
import SecureShareButton from '../shared/SecureShareButton'
import ContinueWithBlob from '../shared/ContinueWithBlob'

export default function MergePdfWorkspace({ files, setFiles, onReset }) {
  const [pageCounts, setPageCounts] = useState({})
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const previewUrl = useBlobUrl(result)

  useEffect(() => {
    let active = true
    Promise.all(files.map((file, index) => countPdfPages(file).then((count) => [index, count]).catch(() => [index, '?'])))
      .then((entries) => {
        if (active) setPageCounts(Object.fromEntries(entries))
      })
    return () => {
      active = false
    }
  }, [files])

  const merge = useCallback(async () => {
    setProcessing(true)
    setError('')
    try {
      const blob = await mergePdfFiles(files)
      setResult(blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }, [files])

  useEffect(() => {
    if (files.length < 2) return
    const id = setTimeout(() => {
      merge()
    }, 500)
    return () => clearTimeout(id)
  }, [files.length, merge])

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
        <div className="file-list-panel" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px' }}>
          {files.map((file, index) => (
            <div className="sortable-row" key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '4px' }}>
              <GripVertical size={18} style={{ cursor: 'grab', opacity: 0.5 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>{index + 1}. {file.name}</span>
              <small style={{ color: 'var(--text-tertiary)' }}>{pageCounts[index] ?? '...'} pages · {formatBytes(file.size)}</small>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="mini-button" type="button" onClick={() => move(index, index - 1)} disabled={index === 0}>↑</button>
                <button className="mini-button" type="button" onClick={() => move(index, index + 1)} disabled={index === files.length - 1}>↓</button>
              </div>
            </div>
          ))}
        </div>
        <div className="file-chip">{files.length} PDFs selected</div>
        <p className="muted-copy" style={{ fontSize: '0.85rem' }}>Pages are copied exactly as-is into one merged PDF. No recompression, no server upload.</p>
        
        {error && <p className="error-message">{error}</p>}
        {result && (
          <div className="success-banner" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--success)', margin: '16px 0' }}>
            Merged PDF ready: {formatBytes(result.size)} {processing && <span style={{ opacity: 0.5 }}>(Updating...)</span>}
          </div>
        )}
        <div className="action-row" style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ flex: 1, minWidth: '120px' }} type="button" onClick={onReset}>Choose PDFs</button>
          <button className="btn btn-primary btn-gradient" style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(to right, #6EE7B7, #3B82F6)', color: '#000', fontWeight: 'bold' }} type="button" disabled={!result || processing} onClick={() => downloadBlob(result, 'fileora-merged.pdf')}>
            <Download size={18} /> Download
          </button>
          {result && !processing && (
            <SecureShareButton 
              file={result} 
              fileName="fileora-merged.pdf" 
              style={{ flex: 1, minWidth: '160px', padding: '14px' }}
            />
          )}
        </div>
        <ContinueWithBlob
          sourceToolId="merge-pdf"
          blob={result}
          fileName="fileora-merged.pdf"
          mimeType="application/pdf"
          disabled={!result || processing}
        />
      </div>
    </section>
  )
}
