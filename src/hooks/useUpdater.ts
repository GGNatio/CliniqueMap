import { useEffect, useState } from 'react'

export type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'ready'; version: string }
  | { type: 'error'; message: string }

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })
  const [version, setVersion] = useState('1.0.0')
  const api = typeof window !== 'undefined' ? window.cliniqueMap : undefined

  useEffect(() => {
    if (!api) return

    void api.getVersion().then(setVersion)
    void api.getUpdateStatus().then(setStatus)
    return api.onUpdateStatus(setStatus)
  }, [api])

  return {
    status,
    version,
    checkForUpdates: () => api?.checkForUpdates(),
    installUpdate: () => api?.installUpdate(),
    isDesktop: Boolean(api),
  }
}
