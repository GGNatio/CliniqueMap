import { useEffect } from 'react'
import type { ClinicsDiff } from '../lib/clinicDiff'
import { CATEGORY_LABELS, type Clinic } from '../types'

interface PublishModalProps {
  open: boolean
  diff: ClinicsDiff | null
  remoteCount: number
  hasToken: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onOpenApi: () => void
  onRefresh: () => void
  onPublish: () => void
}

function ClinicLine({ clinic }: { clinic: Clinic }) {
  return (
    <li>
      <strong>{clinic.name}</strong>
      <span className="muted">
        {' '}
        · {CATEGORY_LABELS[clinic.category]} · {clinic.address}
      </span>
    </li>
  )
}

export function PublishModal({
  open,
  diff,
  remoteCount,
  hasToken,
  busy,
  error,
  onClose,
  onOpenApi,
  onRefresh,
  onPublish,
}: PublishModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const hasChanges = Boolean(diff?.hasChanges)

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <h2 id="publish-title">Centraliser sur GitHub</h2>
            <p className="muted">
              Aperçu des différences avec la liste distante ({remoteCount} clinique
              {remoteCount > 1 ? 's' : ''}).
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Fermer
          </button>
        </header>

        {!hasToken ? (
          <div className="empty-box">
            <p>
              Aucun token API sur ce PC. Configure-le une fois via le bouton{' '}
              <strong>API</strong> (reste local, jamais poussé en ligne).
            </p>
            <button type="button" className="btn btn--primary" onClick={onOpenApi}>
              Ouvrir API
            </button>
          </div>
        ) : (
          <p className="api-status api-status--ok">Token API local prêt</p>
        )}

        {!diff ? (
          <p className="empty">Chargement de la comparaison…</p>
        ) : !hasChanges ? (
          <p className="empty-box">
            Aucune différence. La liste locale est déjà à jour avec GitHub.
          </p>
        ) : (
          <div className="diff-panels">
            {diff.added.length > 0 && (
              <section className="diff-block diff-block--added">
                <h3>Ajouté ({diff.added.length})</h3>
                <ul>
                  {diff.added.map((c) => (
                    <ClinicLine key={c.id} clinic={c} />
                  ))}
                </ul>
              </section>
            )}
            {diff.removed.length > 0 && (
              <section className="diff-block diff-block--removed">
                <h3>Supprimé ({diff.removed.length})</h3>
                <ul>
                  {diff.removed.map((c) => (
                    <ClinicLine key={c.id} clinic={c} />
                  ))}
                </ul>
              </section>
            )}
            {diff.modified.length > 0 && (
              <section className="diff-block diff-block--modified">
                <h3>Modifié ({diff.modified.length})</h3>
                <ul>
                  {diff.modified.map(({ before, after }) => (
                    <li key={after.id}>
                      <strong>{after.name}</strong>
                      <span className="muted"> (était : {before.name})</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onRefresh} disabled={busy}>
            Recalculer le diff
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onPublish}
            disabled={busy || !hasChanges || !hasToken}
          >
            {busy ? 'Envoi…' : 'Envoyer sur GitHub'}
          </button>
        </footer>
      </div>
    </div>
  )
}
