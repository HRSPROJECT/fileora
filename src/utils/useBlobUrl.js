import { useEffect, useState } from 'react'

/** Stable object URL for a Blob/File with automatic revoke on change/unmount. */
export function useBlobUrl(blob) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return undefined
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}