import type { ClinicsSyncStatus } from '../hooks/useClinics'

interface SyncBannerProps {
  status: ClinicsSyncStatus
  onSync: () => void
  onPublish: () => void
}

export function SyncBanner({ status, onSync, onPublish }: SyncBannerProps) {
  if (status.type === 'updated') {
    return (
      <div className="sync-banner sync-banner--updated" role="status">
        <span>
          Hop modif — {status.count} clinique{status.count > 1 ? 's' : ''}{' '}
          synchronisée{status.count > 1 ? 's' : ''}
        </span>
      </div>
    )
  }

  if (status.type === 'checking') {
    return (
      <div className="sync-banner" role="status">
        <span>Vérification GitHub…</span>
      </div>
    )
  }

  if (status.type === 'local-changes') {
    return (
      <div className="sync-banner sync-banner--local" role="status">
        <span>Modifs locales non publiées</span>
        <button type="button" onClick={onPublish}>
          Centraliser
        </button>
      </div>
    )
  }

  if (status.type === 'error') {
    return (
      <div className="sync-banner sync-banner--error" role="status">
        <span>{status.message}</span>
        <button type="button" onClick={onSync}>
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="sync-banner" role="status">
      <span>
        {status.type === 'uptodate'
          ? 'Cliniques à jour (GitHub)'
          : 'Source : GitHub'}
      </span>
      <button type="button" onClick={onSync}>
        Actualiser
      </button>
    </div>
  )
}
