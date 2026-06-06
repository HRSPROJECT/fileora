import { useEffect, useState } from 'react'

/** Tracks `navigator.onLine` and listens for browser online/offline events. */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}