import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { basename, convertImage, downloadBlob, formatBytes } from '../../utils/imageUtils'
import JSZip from 'jszip'
import SecureShareButton from '../shared/SecureShareButton'
import ContinueWithBlob from '../shared/ContinueWithBlob'

export default function ConvertWorkspace({ file, onReset }) {
  const preview = useMemo(() => URL.createObjectURL(file), [file])
  const [format, setFormat] = useState('webp')
  const [quality, setQuality] = useState(90)
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  const process = async () => {
    setProcessing(true)
    setError('')
    try {
      const blob = await convertImage(file, format, quality / 100)
      setResult(blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-preview">
        {preview && <img src={preview} alt={file.name} />}
      </div>
      <div className="workspace-controls">
        <div className="file-chip">{file.name} · {formatBytes(file.size)}</div>
        <label>Output format
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
          </select>
        </label>
        {format !== 'png' && (
          <label>Quality: {quality}%
            <input className="slider" type="range" min="1" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
          </label>
        )}
        {error && <p className="error-message">{error}</p>}
        {result && <p className="success-message">Ready: {formatBytes(result.size)}</p>}
        <div className="action-row" style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ flex: 1, minWidth: '100px' }} type="button" onClick={onReset}>Choose another</button>
          <button className="btn btn-primary" style={{ flex: 1, minWidth: '120px' }} type="button" onClick={process} disabled={processing}>
            {processing ? 'Converting...' : 'Convert image'}
          </button>
          <button
            className="btn btn-primary btn-gradient"
            type="button"
            disabled={!result}
            onClick={() => downloadBlob(result, `${basename(file.name)}.${format}`)}
            style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Download size={18} /> Download
          </button>
          {result && (
            <SecureShareButton 
              file={result} 
              fileName={`${basename(file.name)}.${format}`} 
              style={{ flex: 1, minWidth: '160px', padding: '14px' }}
            />
          )}
        </div>
        <ContinueWithBlob
          sourceToolId="convert"
          blob={result}
          fileName={`${basename(file.name)}.${format}`}
          restoreFile={file}
          disabled={!result || processing}
        />
      </div>
    </section>
  )
}
