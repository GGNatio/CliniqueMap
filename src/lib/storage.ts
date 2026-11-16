import type { Clinic } from '../types'

const CLINICS_KEY = 'cliniquemap.clinics.v1'
const REMOTE_HASH_KEY = 'cliniquemap.clinics.remoteHash'

export function loadClinics(): Clinic[] {
  try {
    const raw = localStorage.getItem(CLINICS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Clinic[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveClinics(clinics: Clinic[]): void {
  localStorage.setItem(CLINICS_KEY, JSON.stringify(clinics))
}

export function loadRemoteHash(): string | null {
  return localStorage.getItem(REMOTE_HASH_KEY)
}

export function saveRemoteHash(hash: string): void {
  localStorage.setItem(REMOTE_HASH_KEY, hash)
}

export function createId(): string {
  return crypto.randomUUID()
}
