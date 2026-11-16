import { BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'ready'; version: string }
  | { type: 'error'; message: string }

let latest: UpdateStatus = { type: 'idle' }

function send(win: BrowserWindow | null, status: UpdateStatus) {
  latest = status
  win?.webContents.send('update:status', status)
}

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // En dev, ne pas spammer les checks (pas de latest.yml local)
  if (!process.env.VITE_DEV_SERVER_URL) {
    autoUpdater.checkForUpdates().catch(() => {
      // silencieux si pas encore de repo / release
    })
  }

  autoUpdater.on('checking-for-update', () => {
    send(getWindow(), { type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    send(getWindow(), { type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info) => {
    send(getWindow(), { type: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    send(getWindow(), {
      type: 'downloading',
      percent: Math.round(progress.percent),
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send(getWindow(), { type: 'ready', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    send(getWindow(), {
      type: 'error',
      message: err?.message || 'Erreur de mise à jour',
    })
  })

  ipcMain.handle('update:get-status', () => latest)
  ipcMain.handle('update:check', async () => {
    if (process.env.VITE_DEV_SERVER_URL) {
      return { type: 'not-available', version: 'dev' } satisfies UpdateStatus
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur de mise à jour'
      send(getWindow(), { type: 'error', message })
    }
    return latest
  })
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}
