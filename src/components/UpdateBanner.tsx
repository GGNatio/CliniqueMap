import type { UpdateStatus } from '../hooks/useUpdater'

interface UpdateBannerProps {
  status: UpdateStatus
  version: string
  onCheck: () => void
  onInstall: () => void
}

export function UpdateBanner({
  status,
  version,
  onCheck,
  onInstall,
}: UpdateBannerProps) {
  let message = `Version ${version}`
  let action: { label: string; onClick: () => void } | null = {
    label: 'Vérifier',
    onClick: onCheck,
  }

  if (status.type === 'checking') {
    message = 'Recherche de mise à jour…'
    action = null
  } else if (status.type === 'available') {
    message = `Version ${status.version} disponible`
    action = null
  } else if (status.type === 'downloading') {
    message = `Téléchargement… ${status.percent}%`
    action = null
  } else if (status.type === 'ready') {
    message = `Version ${status.version} prête`
    action = { label: 'Installer et redémarrer', onClick: onInstall }
  } else if (status.type === 'error') {
    message = 'Mise à jour indisponible'
    action = { label: 'Réessayer', onClick: onCheck }
  }

  return (
    <div className="update-banner" data-state={status.type}>
      <span>{message}</span>
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
