import { useCallback, useEffect, useRef, useState } from 'react'
import { CLINICS_SYNC_INTERVAL_MS } from '../config'
import { fetchRemoteClinics, serializeClinicsFile } from '../lib/clinicSync'
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
  | { type: 'error'; message: string }

export function useClinics() {
  const [clinics, setClinics] = useState<Clinic[]>(() => loadClinics())
  const [syncStatus, setSyncStatus] = useState<ClinicsSyncStatus>({ type: 'idle' })
  const appliedToastTimer = useRef<number | null>(null)

  useEffect(() => {
    saveClinics(clinics)
  }, [clinics])

  const applyRemote = useCallback((next: Clinic[], hash: string) => {
    setClinics(next)
    saveRemoteHash(hash)
    setSyncStatus({ type: 'updated', count: next.length })
    if (appliedToastTimer.current) window.clearTimeout(appliedToastTimer.current)
    appliedToastTimer.current = window.setTimeout(() => {
      setSyncStatus({ type: 'uptodate' })
    }, 5000)
  }, [])

  const syncFromGitHub = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setSyncStatus({ type: 'checking' })
      try {
        const { file, hash } = await fetchRemoteClinics()
        const previous = loadRemoteHash()
        if (previous === hash) {
          if (!opts?.silent) setSyncStatus({ type: 'uptodate' })
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

  return {
    clinics,
    syncStatus,
    addClinic,
    updateClinic,
    removeClinic,
    syncFromGitHub,
    exportForGitHub,
  }
}
