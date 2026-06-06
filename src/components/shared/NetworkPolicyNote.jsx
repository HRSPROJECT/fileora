import { Wifi, WifiOff } from 'lucide-react'

/** Explains that all Fileora tools are offline except P2P Share. */
export function OfflineToolsPolicyNote({ compact = false }) {
  if (compact) {
    return (
      <p className="network-policy-note network-policy-note-compact">
        All Fileora tools work offline after the first load — except <strong>P2P Share</strong>, which needs internet to connect two devices.
      </p>
    )
  }

  return (
    <div className="network-policy-note">
      <Wifi size={16} aria-hidden="true" />
      <p>
        <strong>Offline by default:</strong> compress, convert, edit PDFs, scan, and process video locally in your browser.
        {' '}<strong>P2P Share</strong> is the only tool that needs an active internet connection to pair sender and receiver — your file still never uploads to our servers.
      </p>
    </div>
  )
}

export function NetworkRequiredBanner({ onRetry }) {
  return (
    <div className="network-required-banner" role="alert">
      <WifiOff size={20} aria-hidden="true" />
      <div>
        <strong>Internet connection required for P2P Share</strong>
        <p>
          Enable Wi‑Fi or mobile data to connect with another device. All other Fileora tools continue to work offline.
        </p>
        {onRetry && (
          <button type="button" className="btn btn-secondary network-retry-btn" onClick={onRetry}>
            I&apos;m online — check again
          </button>
        )}
      </div>
    </div>
  )
}