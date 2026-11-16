import { distanceKm } from './geo'

const OSRM_TABLE = 'https://router.project-osrm.org/table/v1/driving'
const FALLBACK_SPEED_KMH = 40

/** Estimation grossière si OSRM indisponible (minutes). */
export function estimateDurationMin(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const km = distanceKm(fromLat, fromLng, toLat, toLng)
  // ~1.3× vol d'oiseau pour approximer la route
  return Math.max(1, Math.round((km * 1.3 * 60) / FALLBACK_SPEED_KMH))
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `~${h} h`
  return `~${h} h ${m.toString().padStart(2, '0')}`
}

/**
 * Durées voiture (minutes) depuis un point vers plusieurs destinations.
 * Utilise OSRM, avec fallback estimation locale.
 */
export async function fetchDrivingDurationsMin(
  from: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number }>,
  signal?: AbortSignal,
): Promise<number[]> {
  if (destinations.length === 0) return []

  const fallback = destinations.map((d) =>
    estimateDurationMin(from.lat, from.lng, d.lat, d.lng),
  )

  try {
    const coords = [
      `${from.lng},${from.lat}`,
      ...destinations.map((d) => `${d.lng},${d.lat}`),
    ].join(';')

    const destIndexes = destinations.map((_, i) => i + 1).join(';')
    const url =
      `${OSRM_TABLE}/${coords}` +
      `?sources=0&destinations=${destIndexes}&annotations=duration`

    const response = await fetch(url, { signal, cache: 'no-store' })
    if (!response.ok) return fallback

    const data = (await response.json()) as {
      code?: string
      durations?: Array<Array<number | null>>
    }

    if (data.code !== 'Ok' || !data.durations?.[0]) return fallback

    return data.durations[0].map((seconds, i) => {
      if (seconds == null || !Number.isFinite(seconds)) return fallback[i]
      return Math.max(1, Math.round(seconds / 60))
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return fallback
  }
}
