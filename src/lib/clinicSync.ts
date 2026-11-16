import { CLINICS_RAW_URL } from '../config'
import type { Clinic, ClinicCategory } from '../types'

export interface ClinicsFile {
  updatedAt: string
  clinics: Clinic[]
}

const CATEGORIES = new Set<ClinicCategory>(['urgence', 'veterinaire'])

export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeClinic(value: unknown): Clinic | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>
  const lat = typeof c.lat === 'number' ? c.lat : Number(c.lat)
  const lng = typeof c.lng === 'number' ? c.lng : Number(c.lng)
  if (
    typeof c.id !== 'string' ||
    typeof c.name !== 'string' ||
    typeof c.address !== 'string' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    typeof c.category !== 'string' ||
    !CATEGORIES.has(c.category as ClinicCategory)
  ) {
    return null
  }

  return {
    id: c.id,
    name: c.name,
    address: c.address,
    phone: typeof c.phone === 'string' && c.phone ? c.phone : undefined,
    email: typeof c.email === 'string' && c.email ? c.email : undefined,
    notes: typeof c.notes === 'string' && c.notes ? c.notes : undefined,
    category: c.category as ClinicCategory,
    lat,
    lng,
  }
}

export function parseClinicsFile(raw: string): ClinicsFile {
  const parsed = JSON.parse(raw) as unknown

  if (Array.isArray(parsed)) {
    const clinics = parsed
      .map(normalizeClinic)
      .filter((c): c is Clinic => c !== null)
    return { updatedAt: new Date().toISOString(), clinics }
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as ClinicsFile).clinics)) {
    const file = parsed as ClinicsFile
    return {
      updatedAt:
        typeof file.updatedAt === 'string'
          ? file.updatedAt
          : new Date().toISOString(),
      clinics: file.clinics
        .map(normalizeClinic)
        .filter((c): c is Clinic => c !== null),
    }
  }

  throw new Error('Format de cliniques.json invalide.')
}

export function serializeClinicsFile(clinics: Clinic[]): string {
  const file: ClinicsFile = {
    updatedAt: new Date().toISOString(),
    clinics,
  }
  return `${JSON.stringify(file, null, 2)}\n`
}

export async function fetchRemoteClinics(): Promise<{
  file: ClinicsFile
  hash: string
  raw: string
}> {
  const url = `${CLINICS_RAW_URL}?t=${Date.now()}`
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (response.status === 404) {
    throw new Error(
      'Fichier GitHub introuvable. Poussez data/cliniques.json sur le dépôt.',
    )
  }

  if (!response.ok) {
    throw new Error(`Impossible de télécharger les cliniques (${response.status}).`)
  }

  const raw = await response.text()
  const file = parseClinicsFile(raw)
  const hash = await hashText(raw)
  return { file, hash, raw }
}
