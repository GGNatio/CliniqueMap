import { useCallback, useEffect, useRef, useState } from 'react'
import { CLINICS_SYNC_INTERVAL_MS } from '../config'
import { diffClinics, type ClinicsDiff } from '../lib/clinicDiff'
import { fetchRemoteClinics, serializeClinicsFile } from '../lib/clinicSync'
import {
  fetchRemoteClinicsViaApi,
  loadGithubToken,
  pushClinicsToGithub,
  saveGithubToken,
} from '../lib/githubApi'
import {
  createId,
  loadClinics,
  loadRemoteHash,
  saveClinics,
  saveRemoteHash,
} from '../lib/storage'
import type { Clinic, ClinicCategory } from '../types'

export type ClinicInput = {
  name: string
  address: string
  phone?: string
  email?: string
  notes?: string
  category: ClinicCategory
  lat: number
  lng: number
}

export type ClinicsSyncStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'updated'; count: number }
  | { type: 'uptodate' }
  | { type: 'local-changes' }
  | { type: 'error'; message: string }

const REMOTE_SNAPSHOT_KEY = 'cliniquemap.clinics.remoteSnapshot'

function loadRemoteSnapshot(): Clinic[] {
  try {
    const raw = localStorage.getItem(REMOTE_SNAPSHOT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Clinic[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRemoteSnapshot(clinics: Clinic[]): void {
  localStorage.setItem(REMOTE_SNAPSHOT_KEY, JSON.stringify(clinics))
}

export function useClinics() {
  const [clinics, setClinics] = useState<Clinic[]>(() => loadClinics())
  const [remoteSnapshot, setRemoteSnapshot] = useState<Clinic[]>(() =>
    loadRemoteSnapshot(),
  )
  const [syncStatus, setSyncStatus] = useState<ClinicsSyncStatus>({ type: 'idle' })
  const [githubToken, setGithubTokenState] = useState(() => loadGithubToken())
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishDiff, setPublishDiff] = useState<ClinicsDiff | null>(null)
  const [publishRemoteCount, setPublishRemoteCount] = useState(0)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const appliedToastTimer = useRef<number | null>(null)
  const clinicsRef = useRef(clinics)
  const remoteSnapshotRef = useRef(remoteSnapshot)

  useEffect(() => {
    clinicsRef.current = clinics
  }, [clinics])

  useEffect(() => {
    remoteSnapshotRef.current = remoteSnapshot
  }, [remoteSnapshot])

  useEffect(() => {
    saveClinics(clinics)
    const dirty = diffClinics(clinics, remoteSnapshot).hasChanges
    if (dirty) setSyncStatus({ type: 'local-changes' })
  }, [clinics, remoteSnapshot])

  const setGithubToken = useCallback((token: string) => {
    saveGithubToken(token)
    setGithubTokenState(token)
  }, [])

  const markRemoteApplied = useCallback((next: Clinic[], hash: string) => {
    setClinics(next)
    setRemoteSnapshot(next)
    saveRemoteSnapshot(next)
    saveRemoteHash(hash)
  }, [])

  const applyRemote = useCallback(
    (next: Clinic[], hash: string) => {
      markRemoteApplied(next, hash)
      setSyncStatus({ type: 'updated', count: next.length })
      if (appliedToastTimer.current) window.clearTimeout(appliedToastTimer.current)
      appliedToastTimer.current = window.setTimeout(() => {
        setSyncStatus({ type: 'uptodate' })
      }, 5000)
    },
    [markRemoteApplied],
  )

  const syncFromGitHub = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      const hasLocalChanges = () =>
        diffClinics(clinicsRef.current, remoteSnapshotRef.current).hasChanges

      if (hasLocalChanges() && !opts?.force) {
        if (!opts?.silent) setSyncStatus({ type: 'local-changes' })
        return { changed: false, skipped: true }
      }

      if (!opts?.silent) setSyncStatus({ type: 'checking' })
      try {
        const { file, hash } = await fetchRemoteClinics()

        // Re-check après le réseau : ne jamais écraser un ajout local en cours
        if (hasLocalChanges() && !opts?.force) {
          setSyncStatus({ type: 'local-changes' })
          return { changed: false, skipped: true }
        }

        const previous = loadRemoteHash()
        if (previous === hash) {
          setRemoteSnapshot(file.clinics)
          saveRemoteSnapshot(file.clinics)
          if (!opts?.silent) {
            setSyncStatus(
              hasLocalChanges() ? { type: 'local-changes' } : { type: 'uptodate' },
            )
          }
          return { changed: false }
        }
        applyRemote(file.clinics, hash)
        return { changed: true }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Erreur de synchronisation.'
        if (!opts?.silent) setSyncStatus({ type: 'error', message })
        return { changed: false, error: message }
      }
    },
    [applyRemote],
  )

  useEffect(() => {
    void syncFromGitHub({ silent: true })
    const id = window.setInterval(() => {
      void syncFromGitHub({ silent: true })
    }, CLINICS_SYNC_INTERVAL_MS)
    return () => {
      window.clearInterval(id)
      if (appliedToastTimer.current) window.clearTimeout(appliedToastTimer.current)
    }
  }, [syncFromGitHub])

  const addClinic = useCallback((input: ClinicInput) => {
    const clinic: Clinic = { ...input, id: createId() }
    setClinics((prev) => [...prev, clinic])
    return clinic
  }, [])

  const updateClinic = useCallback((id: string, input: ClinicInput) => {
    setClinics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...input } : c)),
    )
  }, [])

  const removeClinic = useCallback((id: string) => {
    setClinics((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const exportForGitHub = useCallback(() => {
    const content = serializeClinicsFile(clinics)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cliniques.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [clinics])

  const refreshPublishDiff = useCallback(async () => {
    setPublishError(null)
    setPublishDiff(null)
    try {
      let remote: Clinic[]
      if (githubToken.trim()) {
        const result = await fetchRemoteClinicsViaApi(githubToken.trim())
        remote = result.clinics
      } else {
        const result = await fetchRemoteClinics()
        remote = result.file.clinics
      }
      setPublishRemoteCount(remote.length)
      setPublishDiff(diffClinics(clinicsRef.current, remote))
    } catch (e) {
      setPublishError(
        e instanceof Error ? e.message : 'Impossible de comparer avec GitHub.',
      )
    }
  }, [githubToken])

  const openPublishModal = useCallback(async () => {
    setPublishOpen(true)
    setPublishBusy(false)
    await refreshPublishDiff()
  }, [refreshPublishDiff])

  const closePublishModal = useCallback(() => {
    if (publishBusy) return
    setPublishOpen(false)
    setPublishError(null)
  }, [publishBusy])

  const publishToGithub = useCallback(async () => {
    const token = githubToken.trim()
    if (!token) {
      setPublishError('Ajoutez un token GitHub pour envoyer.')
      return
    }
    setPublishBusy(true)
    setPublishError(null)
    try {
      const { hash } = await pushClinicsToGithub({
        token,
        clinics: clinicsRef.current,
      })
      markRemoteApplied(clinicsRef.current, hash)
      setSyncStatus({ type: 'uptodate' })
      setPublishOpen(false)
      setPublishDiff(null)
    } catch (e) {
      setPublishError(
        e instanceof Error ? e.message : 'Échec de l’envoi sur GitHub.',
      )
    } finally {
      setPublishBusy(false)
    }
  }, [githubToken, markRemoteApplied])

  return {
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
    exportForGitHub,
    setGithubToken,
    openPublishModal,
    closePublishModal,
    refreshPublishDiff,
    publishToGithub,
  }
}
