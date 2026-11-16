/// <reference types="vite/client" />

type CliniqueUpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'ready'; version: string }
  | { type: 'error'; message: string }

interface CliniqueMapApi {
  platform: NodeJS.Platform
  getVersion: () => Promise<string>
  getUpdateStatus: () => Promise<CliniqueUpdateStatus>
  checkForUpdates: () => Promise<CliniqueUpdateStatus>
  installUpdate: () => Promise<void>
  onUpdateStatus: (
    callback: (status: CliniqueUpdateStatus) => void,
  ) => () => void
}

interface Window {
  cliniqueMap?: CliniqueMapApi
}
