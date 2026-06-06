import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { useShare } from '../../context/ShareContext'
import { useNetworkStatus } from '../../utils/useNetworkStatus'

export default function SecureShareButton({ file, fileName, style }) {
  const navigate = useNavigate()
  const { setFileToShare } = useShare()
  const isOnline = useNetworkStatus()
  const [networkError, setNetworkError] = useState('')

  const handleShareDirectly = () => {
    if (!file) return

    if (!isOnline) {
      setNetworkError(
        'P2P Share needs an internet connection to connect two devices. Enable Wi‑Fi or mobile data, then try again. All other Fileora tools work offline.'
      )
      return
    }

    setNetworkError('')

    const fileObj = file instanceof File
      ? file
      : new File([file], fileName || 'shared-file', { type: file.type || 'application/octet-stream' })

    setFileToShare(fileObj)
    navigate('/share')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: style?.flex, minWidth: style?.minWidth }}>
      <button
        type="button"
        onClick={handleShareDirectly}
        className="btn btn-secondary"
        title="Requires internet to pair devices. Your file is not uploaded to Fileora."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
          ...style,
        }}
      >
        <Share2 size={16} style={{ color: 'var(--accent-primary)' }} />
        <span>Share Directly (P2P)</span>
      </button>
      {networkError && (
        <p className="secure-share-network-error" role="alert">
          {networkError}
        </p>
      )}
    </div>
  )
}