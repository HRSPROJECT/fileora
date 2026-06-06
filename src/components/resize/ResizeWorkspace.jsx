import { useEffect, useState, useCallback } from 'react'
import { Download, Image as ImageIcon, Lock, Unlock } from 'lucide-react'
import { basename, downloadBlob, formatBytes, resizeImage } from '../../utils/imageUtils'
import { readImageDimensions } from '../../utils/canvasUtils'
import { useBlobUrl } from '../../utils/useBlobUrl'
import SecureShareButton from '../shared/SecureShareButton'
import ContinueWithBlob from '../shared/ContinueWithBlob'

const presets = [
  ['Custom', null],
  ['WhatsApp DP', [192, 192]],
  ['Instagram Post', [1080, 1080]],
  ['Passport Photo', [413, 531]],
  ['Twitter Header', [1500, 500]],
  ['LinkedIn Cover', [1584, 396]],
]

export default function ResizeWorkspace({ file, onReset }) {
  const [source, setSource] = useState(null)
  const [width, setWidth] = useState(1080)
  const [height, setHeight] = useState(1080)
  const [locked, setLocked] = useState(true)
  const [aspect, setAspect] = useState(1)
  const [format, setFormat] = useState('webp')
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const resultUrl = useBlobUrl(result)

  useEffect(() => {
    let active = true
    readImageDimensions(file).then((meta) => {
      if (!active) return
      setSource(meta)
      setWidth(meta.width)
      setHeight(meta.height)
      setAspect(meta.width / meta.height)
    }).catch((err) => setError(err.message))
    return () => {
      active = false
    }
  }, [file])

  const runResize = useCallback(async () => {
    setProcessing(true)
    setError('')
    try {
      const blob = await resizeImage(file, width, height, format)
      setResult(blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }, [file, width, height, format])

  useEffect(() => {
    if (!source || !width || !height) return
    const id = setTimeout(() => {
      runResize()
    }, 300)
    return () => clearTimeout(id)
  }, [source, width, height, format, runResize])

  const updateWidth = (value) => {
    const next = Number(value) || 0
    setWidth(next)
    if (locked && next) setHeight(Math.max(1, Math.round(next / aspect)))
  }

  const updateHeight = (value) => {
    const next = Number(value) || 0
    setHeight(next)
    if (locked && next) setWidth(Math.max(1, Math.round(next * aspect)))
  }

  const applyPreset = (preset) => {
    if (!preset) return
    setWidth(preset[0])
    setHeight(preset[1])
  }

  return (
    <section className="workspace-panel">
      <div className="workspace-preview">
        {(result || source) ? (
          <img 
            src={resultUrl || source?.url}
            alt="Preview" 
          />
        ) : (
          <ImageIcon size={44} />
        )}
      </div>
      <div className="workspace-controls">
        <label>Dimensions Preset</label>
        <select className="input-select" onChange={(event) => applyPreset(presets[event.target.selectedIndex][1])}>
          {presets.map(([label]) => <option key={label}>{label}</option>)}
        </select>
        
        <div className="control-row two">
          <label>Width <input type="number" min="1" value={width || ''} onChange={(event) => updateWidth(event.target.value)} /></label>
          <label>Height <input type="number" min="1" value={height || ''} onChange={(event) => updateHeight(event.target.value)} /></label>
        </div>
        
        <button className="btn btn-secondary btn-full" type="button" onClick={() => setLocked((value) => !value)}>
          {locked ? <Lock size={18} /> : <Unlock size={18} />} Lock aspect ratio
        </button>
        
        <label>Output format
          <select className="input-select" value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        
        {error && <p className="error-message">{error}</p>}
        {result && (
          <div className="success-banner" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--success)', margin: '16px 0' }}>
            Ready: {formatBytes(result.size)} {processing && <span style={{ opacity: 0.5 }}>(Updating...)</span>}
          </div>
        )}
        
        <div className="action-row" style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ flex: 1, minWidth: '100px' }} type="button" onClick={onReset}>Choose another</button>
          <button
            className="btn btn-primary btn-gradient"
            style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(to right, #6EE7B7, #3B82F6)', color: '#000', fontWeight: 'bold' }}
            type="button"
            disabled={!result || processing}
            onClick={() => downloadBlob(result, `${basename(file.name)}-${width}x${height}.${format}`)}
          >
            <Download size={18} /> Download
          </button>
          {result && !processing && (
            <SecureShareButton 
              file={result} 
              fileName={`${basename(file.name)}-${width}x${height}.${format}`} 
              style={{ flex: 1, minWidth: '160px', padding: '14px' }}
            />
          )}
        </div>
        <ContinueWithBlob
          sourceToolId="resize"
          blob={result}
          fileName={`${basename(file.name)}-${width}x${height}.${format}`}
          restoreFile={file}
          disabled={!result || processing}
        />
      </div>
    </section>
  )
}
