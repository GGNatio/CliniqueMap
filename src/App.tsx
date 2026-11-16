import { useMemo, useState } from 'react'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { useClinics } from './hooks/useClinics'
import { useUpdater } from './hooks/useUpdater'
import { distanceKm } from './lib/geo'
import { geocodeAddress, type GeocodeResult } from './lib/geocode'
import type { ClientLocation, ClinicWithDistance } from './types'
import 'leaflet/dist/leaflet.css'
import './App.css'

export default function App() {
  const {
    clinics,
    syncStatus,
    githubToken,
    publishOpen,
    publishDiff,
    publishRemoteCount,
    publishBusy,
    publishError,
    addClinic,
    updateClinic,
    removeClinic,
    syncFromGitHub,
    setGithubToken,
    openPublishModal,
    closePublishModal,
    refreshPublishDiff,
    publishToGithub,
  } = useClinics()
  const {
    status: updateStatus,
    version: appVersion,
    checkForUpdates,
    installUpdate,
    isDesktop,
  } = useUpdater()
  const [client, setClient] = useState<ClientLocation | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const ranked: ClinicWithDistance[] = useMemo(() => {
    const withDistance = clinics.map((clinic) => ({
      ...clinic,
      distanceKm: client
        ? distanceKm(client.lat, client.lng, clinic.lat, clinic.lng)
        : Number.NaN,
    }))

    if (!client) return withDistance

    return [...withDistance].sort((a, b) => a.distanceKm - b.distanceKm)
  }, [clinics, client])

  function handlePickAddress(result: GeocodeResult) {
    setSearchError(null)
    setClient(result)
    setSelectedId(null)
  }

  async function handleSearch(query: string) {
    setSearchError(null)
    setSearching(true)
    try {
      const result = await geocodeAddress(query)
      if (!result) {
        setSearchError('Adresse introuvable. Essayez une ville ou une adresse plus précise.')
        return
      }
      handlePickAddress(result)
    } catch (e) {
      setSearchError(
        e instanceof Error ? e.message : 'Erreur lors de la recherche.',
      )
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="app">
      <Sidebar
        client={client}
        ranked={ranked}
        clinics={clinics}
        selectedId={selectedId}
        searching={searching}
        searchError={searchError}
        syncStatus={syncStatus}
        updateStatus={updateStatus}
        appVersion={appVersion}
        showUpdater={isDesktop}
        githubToken={githubToken}
        publishOpen={publishOpen}
        publishDiff={publishDiff}
        publishRemoteCount={publishRemoteCount}
        publishBusy={publishBusy}
        publishError={publishError}
        onSearch={handleSearch}
        onPickAddress={handlePickAddress}
        onClearClient={() => {
          setClient(null)
          setSelectedId(null)
        }}
        onSelect={setSelectedId}
        onAdd={addClinic}
        onUpdate={updateClinic}
        onRemove={removeClinic}
        onSyncClinics={() => {
          void syncFromGitHub()
        }}
        onForceSyncClinics={() => {
          void syncFromGitHub({ force: true })
        }}
        onOpenPublish={() => {
          void openPublishModal()
        }}
        onClosePublish={closePublishModal}
        onRefreshPublish={() => {
          void refreshPublishDiff()
        }}
        onPublish={() => {
          void publishToGithub()
        }}
        onGithubTokenChange={setGithubToken}
        onCheckUpdate={() => {
          void checkForUpdates()
        }}
        onInstallUpdate={() => {
          void installUpdate()
        }}
      />
      <main className="app__map">
        <MapView
          client={client}
          clinics={ranked}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="legend" aria-hidden>
          <span>
            <i className="legend__dot legend__dot--client" /> Client
          </span>
          <span>
            <i className="legend__dot legend__dot--urgence" /> Urgence
          </span>
          <span>
            <i className="legend__dot legend__dot--veterinaire" /> Vétérinaire
          </span>
        </div>
      </main>
    </div>
  )
}
