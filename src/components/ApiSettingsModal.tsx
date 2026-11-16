import { useEffect, useState } from 'react'

interface ApiSettingsModalProps {
  open: boolean
  token: string
  onClose: () => void
  onSave: (token: string) => void
}

export function ApiSettingsModal({
  open,
  token,
  onClose,
  onSave,
}: ApiSettingsModalProps) {
  const [draft, setDraft] = useState(token)
  const [show, setShow] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(token)
      setShow(false)
      setSavedFlash(false)
    }
  }, [open, token])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function handleSave() {
    onSave(draft.trim())
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  function handleClear() {
    setDraft('')
    onSave('')
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <h2 id="api-title">API GitHub</h2>
            <p className="muted">
              Token stocké <strong>uniquement sur ce PC</strong> — jamais envoyé
              dans le dépôt ni dans une release.
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fermer
          </button>
        </header>

        <div className="modal__token">
          <label htmlFor="api-token">
            Token (Contents: Read and write)
            <button
              type="button"
              className="linkish"
              onClick={() => setShow((v) => !v)}
            >
              {show ? 'Masquer' : 'Afficher'}
            </button>
          </label>
          <input
            id="api-token"
            type={show ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="panel__hint">
            Crée un fine-grained token sur GitHub (dépôt CliniqueMap, permission
            Contents). Colle-le ici une fois : il restera sauvegardé localement
            pour centraliser les cliniques.
          </p>
          {token.trim() ? (
            <p className="api-status api-status--ok">Token enregistré sur ce PC</p>
          ) : (
            <p className="api-status">Aucun token enregistré</p>
          )}
          {savedFlash && <p className="api-status api-status--ok">Enregistré.</p>}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={handleClear}>
            Effacer
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave}>
            Enregistrer
          </button>
        </footer>
      </div>
    </div>
  )
}
