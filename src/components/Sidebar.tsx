import { useMemo, useState } from 'react'
import type { ClinicInput, ClinicsSyncStatus } from '../hooks/useClinics'
import type { UpdateStatus } from '../hooks/useUpdater'
import type { GeocodeResult } from '../lib/geocode'
import { formatDistance } from '../lib/geo'
import type {
  ClientLocation,
  Clinic,
  ClinicCategory,
  ClinicWithDistance,
} from '../types'
import { CATEGORY_LABELS } from '../types'
import { AddressSearch } from './AddressSearch'
import { ClinicForm } from './ClinicForm'
import { SyncBanner } from './SyncBanner'
import { UpdateBanner } from './UpdateBanner'

type Filter = 'all' | ClinicCategory
type Mode = 'search' | 'manage' | 'form'

interface SidebarProps {
  client: ClientLocation | null
  ranked: ClinicWithDistance[]
  clinics: Clinic[]
  selectedId: string | null
  searching: boolean
  searchError: string | null
  syncStatus: ClinicsSyncStatus
  updateStatus: UpdateStatus
  appVersion: string
  showUpdater: boolean
  onSearch: (query: string) => void
  onPickAddress: (result: GeocodeResult) => void
  onClearClient: () => void
  onSelect: (id: string) => void
  onAdd: (input: ClinicInput) => void
  onUpdate: (id: string, input: ClinicInput) => void
  onRemove: (id: string) => void
  onSyncClinics: () => void
  onExportClinics: () => void
  onCheckUpdate: () => void
  onInstallUpdate: () => void
}

export function Sidebar({
  client,
  ranked,
  clinics,
  selectedId,
  searching,
  searchError,
  syncStatus,
  updateStatus,
  appVersion,
  showUpdater,
  onSearch,
  onPickAddress,
  onClearClient,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onSyncClinics,
  onExportClinics,
  onCheckUpdate,
  onInstallUpdate,
}: SidebarProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [mode, setMode] = useState<Mode>('search')
  const [editing, setEditing] = useState<Clinic | null>(null)

  const visible = useMemo(() => {
    if (filter === 'all') return ranked
    return ranked.filter((c) => c.category === filter)
  }, [ranked, filter])

  function openCreate() {
    setEditing(null)
    setMode('form')
  }

  function openEdit(clinic: Clinic) {
    setEditing(clinic)
    setMode('form')
  }

  function handleSubmit(input: ClinicInput) {
    if (editing) onUpdate(editing.id, input)
    else onAdd(input)
    setEditing(null)
    setMode('manage')
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__brand">
        <div className="sidebar__mark" aria-hidden />
        <div>
          <p className="sidebar__title">CliniqueMap</p>
          <p className="sidebar__subtitle">Orientation d’urgence</p>
        </div>
      </header>

      <SyncBanner status={syncStatus} onSync={onSyncClinics} />

      <nav className="sidebar__tabs" aria-label="Navigation">
        <button
          type="button"
          onClick={() => {
            setMode('search')
            setEditing(null)
          }}
          data-active={mode === 'search' || (mode === 'form' && !editing)}
        >
          Recherche
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('manage')
            setEditing(null)
          }}
          data-active={mode === 'manage' || (mode === 'form' && !!editing)}
        >
          Cliniques
        </button>
      </nav>

      {mode === 'form' ? (
        <ClinicForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setMode(editing ? 'manage' : 'search')}
        />
      ) : mode === 'manage' ? (
        <div className="panel">
          <div className="panel__header">
            <h2>Vos cliniques</h2>
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              Ajouter
            </button>
          </div>
          <p className="panel__hint">
            Source centrale : <code>data/cliniques.json</code> sur GitHub. Après
            modification ici, exportez le JSON puis poussez-le sur le dépôt pour
            tous les PC.
          </p>
          <div className="panel__tools">
            <button type="button" className="btn btn--ghost" onClick={onSyncClinics}>
              Télécharger depuis GitHub
            </button>
            <button type="button" className="btn btn--ghost" onClick={onExportClinics}>
              Exporter cliniques.json
            </button>
          </div>
          {clinics.length === 0 ? (
            <p className="empty">Aucune clinique enregistrée pour l’instant.</p>
          ) : (
            <ul className="clinic-list">
              {clinics.map((clinic) => (
                <li key={clinic.id} className="clinic-card">
                  <div className="clinic-card__top">
                    <span className={`badge badge--${clinic.category}`}>
                      {CATEGORY_LABELS[clinic.category]}
                    </span>
                    <div className="clinic-card__actions">
                      <button type="button" onClick={() => openEdit(clinic)}>
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          if (confirm(`Supprimer « ${clinic.name} » ?`)) {
                            onRemove(clinic.id)
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <strong>{clinic.name}</strong>
                  <p>{clinic.address}</p>
                  {clinic.phone && <p className="muted">{clinic.phone}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="panel">
          <AddressSearch
            searching={searching}
            onSearch={onSearch}
            onPick={onPickAddress}
          />

          {searchError && <p className="form-error">{searchError}</p>}

          {client && (
            <div className="client-chip">
              <div>
                <span className="client-chip__label">Client localisé</span>
                <p>{client.label}</p>
              </div>
              <button type="button" className="btn btn--ghost" onClick={onClearClient}>
                Effacer
              </button>
            </div>
          )}

          <div className="filters">
            {(
              [
                ['all', 'Toutes'],
                ['urgence', 'Urgences'],
                ['veterinaire', 'Vétérinaires'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-active={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="panel__header">
            <h2>{client ? 'Les plus proches' : 'Toutes les cliniques'}</h2>
            <span className="count">{visible.length}</span>
          </div>

          {clinics.length === 0 ? (
            <div className="empty-box">
              <p>Aucune clinique. Synchronisez GitHub ou ajoutez-en.</p>
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                Ajouter une clinique
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="empty">Aucune clinique dans ce filtre.</p>
          ) : (
            <ul className="clinic-list">
              {visible.map((clinic) => (
                <li key={clinic.id}>
                  <button
                    type="button"
                    className={`clinic-card clinic-card--button ${
                      selectedId === clinic.id ? 'is-selected' : ''
                    }`}
                    onClick={() => onSelect(clinic.id)}
                  >
                    <div className="clinic-card__top">
                      <span className={`badge badge--${clinic.category}`}>
                        {CATEGORY_LABELS[clinic.category]}
                      </span>
                      {client && Number.isFinite(clinic.distanceKm) && (
                        <span className="distance">
                          {formatDistance(clinic.distanceKm)}
                        </span>
                      )}
                    </div>
                    <strong>{clinic.name}</strong>
                    <p>{clinic.address}</p>
                    {clinic.phone && <p className="muted">{clinic.phone}</p>}
                    {clinic.notes && <p className="notes">{clinic.notes}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showUpdater && (
        <UpdateBanner
          status={updateStatus}
          version={appVersion}
          onCheck={onCheckUpdate}
          onInstall={onInstallUpdate}
        />
      )}
    </aside>
  )
}
