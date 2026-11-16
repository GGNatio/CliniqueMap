export interface GeocodeResult {
  label: string
  lat: number
  lng: number
}

export interface PlaceLookup {
  name: string
  address: string
  lat: number
  lng: number
  phone?: string
  email?: string
}

type NominatimItem = {
  name?: string
  display_name: string
  lat: string
  lon: string
  osm_type?: string
  osm_id?: number
  extratags?: Record<string, string> | null
  namedetails?: Record<string, string> | null
  address?: Record<string, string> | null
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
    osm_key?: string
    osm_value?: string
    name?: string
    housenumber?: string
    street?: string
    city?: string
    town?: string
    village?: string
    district?: string
    postcode?: string
    state?: string
    country?: string
    countrycode?: string
  }
}

const STOP_WORDS = new Set([
  'clinique',
  'veterinaire',
  'vétérinaire',
  'cabinet',
  'urgence',
  'urgences',
  'centre',
  'des',
  'de',
  'du',
  'la',
  'le',
  'les',
  'l',
  'd',
  'et',
  'a',
  'au',
  'aux',
])

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function significantTokens(query: string): string[] {
  return normalizeText(query)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function simplifyQuery(query: string): string {
  const tokens = significantTokens(query)
  return tokens.join(' ')
}

function pickExtra(
  tags: Record<string, string> | null | undefined,
  keys: string[],
): string | undefined {
  if (!tags) return undefined
  for (const key of keys) {
    const value = tags[key]?.trim()
    if (value) return value
  }
  return undefined
}

function formatOsmAddress(item: NominatimItem): string {
  const a = item.address
  if (!a) return item.display_name

  const street = [a.house_number, a.road || a.pedestrian || a.footway]
    .filter(Boolean)
    .join(' ')
  const city = a.city || a.town || a.village || a.municipality || a.hamlet
  const parts = [street, a.postcode, city].filter(Boolean)
  return parts.length >= 2 ? parts.join(', ') : item.display_name
}

function formatPhotonAddress(props: PhotonFeature['properties']): string {
  let street = props.street || ''
  if (props.housenumber) {
    const normalizedStreet = street.trim()
    street = normalizedStreet.startsWith(props.housenumber)
      ? normalizedStreet
      : `${props.housenumber} ${normalizedStreet}`.trim()
  }
  const city = props.city || props.town || props.village || props.district
  const parts = [street, props.postcode, city].filter(Boolean)
  return parts.join(', ')
}

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'fr',
  'User-Agent': 'CliniqueMap/1.0 (https://github.com/GGNatio/CliniqueMap)',
} as const

function scorePlace(name: string, queryTokens: string[]): number {
  const normalizedName = normalizeText(name)
  if (!queryTokens.length) return 0
  let score = 0
  for (const token of queryTokens) {
    if (normalizedName.includes(token)) score += token.length >= 4 ? 3 : 2
  }
  // Bonus si presque tous les mots distinctifs matchent
  if (score > 0 && queryTokens.every((t) => normalizedName.includes(t))) {
    score += 10
  }
  return score
}

function osmLookupId(osmType: string, osmId: number): string | null {
  const prefix =
    osmType === 'N' || osmType === 'node'
      ? 'N'
      : osmType === 'W' || osmType === 'way'
        ? 'W'
        : osmType === 'R' || osmType === 'relation'
          ? 'R'
          : null
  if (!prefix) return null
  return `${prefix}${osmId}`
}

async function photonSearch(
  query: string,
  signal?: AbortSignal,
): Promise<PhotonFeature[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    q: trimmed,
    lang: 'fr',
    limit: '8',
  })
  // Plusieurs osm_tag = AND dans Photon ; on filtre côté client pour rester souple
  params.append('osm_tag', 'amenity:veterinary')

  const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return []
  const data = (await response.json()) as { features?: PhotonFeature[] }
  return data.features ?? []
}

async function nominatimLookup(
  osmIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, NominatimItem>> {
  const map = new Map<string, NominatimItem>()
  if (!osmIds.length) return map

  const params = new URLSearchParams({
    osm_ids: osmIds.join(','),
    format: 'json',
    addressdetails: '1',
    extratags: '1',
    namedetails: '1',
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/lookup?${params}`,
    {
      signal,
      headers: NOMINATIM_HEADERS,
    },
  )
  if (!response.ok) return map

  const data = (await response.json()) as NominatimItem[]
  for (const item of data) {
    if (!item.osm_type || item.osm_id == null) continue
    const id = osmLookupId(item.osm_type, item.osm_id)
    if (id) map.set(id, item)
  }
  return map
}

async function nominatimSearch(
  query: string,
  limit: string,
  signal?: AbortSignal,
): Promise<NominatimItem[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit,
    countrycodes: 'fr,be,ch,lu',
    addressdetails: '1',
    extratags: '1',
    namedetails: '1',
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      signal,
      headers: NOMINATIM_HEADERS,
    },
  )

  if (!response.ok) {
    throw new Error('Recherche OpenStreetMap indisponible pour le moment.')
  }

  return (await response.json()) as NominatimItem[]
}

function mapNominatim(
  data: Array<{ display_name: string; lat: string; lon: string }>,
): GeocodeResult[] {
  return data.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }))
}

/** Suggestions d’adresse pendant la saisie (Nominatim) */
export async function suggestAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []
  const data = await nominatimSearch(trimmed, '6', signal)
  return mapNominatim(data)
}

/** Recherche d’établissement avec Photon (flou) + détails Nominatim */
export async function suggestPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceLookup[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const simplified = simplifyQuery(trimmed)
  const tokens = significantTokens(trimmed)

  const queries = [...new Set([trimmed, simplified].filter((q) => q.length >= 2))]

  const batches = await Promise.all(queries.map((q) => photonSearch(q, signal)))
  const features = batches.flat()

  const byOsm = new Map<
    string,
    { feature: PhotonFeature; score: number; osmId: string }
  >()

  for (const feature of features) {
    const props = feature.properties
    if (!props.osm_id || !props.osm_type || !props.name) continue
    // On accepte veterinary en priorité, mais aussi d’autres si le score est fort
    const osmId = osmLookupId(props.osm_type, props.osm_id)
    if (!osmId) continue

    let score = scorePlace(props.name, tokens)
    if (props.osm_value === 'veterinary') score += 5
    if (score <= 0 && tokens.length > 0) continue

    const existing = byOsm.get(osmId)
    if (!existing || score > existing.score) {
      byOsm.set(osmId, { feature, score, osmId })
    }
  }

  let ranked = [...byOsm.values()].sort((a, b) => b.score - a.score)

  // Si rien n’a scoré (requête trop générique), garder les vétérinaires Photon bruts
  if (!ranked.length) {
    for (const feature of features) {
      const props = feature.properties
      if (!props.osm_id || !props.osm_type || !props.name) continue
      if (props.osm_value !== 'veterinary') continue
      const osmId = osmLookupId(props.osm_type, props.osm_id)
      if (!osmId || byOsm.has(osmId)) continue
      ranked.push({ feature, score: 1, osmId })
    }
  }

  // Si plusieurs mots distinctifs (ex. "arche" + "nac"), prioriser les fiches qui les ont tous
  if (tokens.length >= 2) {
    const allTokens = ranked.filter((r) => {
      const name = normalizeText(r.feature.properties.name || '')
      return tokens.every((token) => name.includes(token))
    })
    if (allTokens.length) ranked = allTokens
  }

  ranked = ranked.slice(0, 6)
  if (!ranked.length) return []

  // Petite pause pour respecter la politesse Nominatim après Photon
  await new Promise((resolve) => setTimeout(resolve, 200))

  const details = await nominatimLookup(
    ranked.map((r) => r.osmId),
    signal,
  )

  return ranked.map(({ feature, osmId }) => {
    const props = feature.properties
    const detail = details.get(osmId)
    const [lng, lat] = feature.geometry.coordinates
    // Photon est souvent plus juste sur la rue ; Nominatim sert surtout aux contacts
    const photonAddress = formatPhotonAddress(props)

    if (detail) {
      return {
        name: detail.namedetails?.name || detail.name || props.name || 'Clinique',
        address: photonAddress || formatOsmAddress(detail),
        lat: Number(detail.lat) || lat,
        lng: Number(detail.lon) || lng,
        phone: pickExtra(detail.extratags ?? undefined, [
          'phone',
          'contact:phone',
          'contact:mobile',
          'telephone',
        ]),
        email: pickExtra(detail.extratags ?? undefined, [
          'email',
          'contact:email',
        ]),
      }
    }

    return {
      name: props.name || 'Clinique',
      address: photonAddress || `${lat}, ${lng}`,
      lat,
      lng,
    }
  })
}

/** Géocodage exact (1 résultat) via Nominatim */
export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  const results = await suggestAddresses(query)
  return results[0] ?? null
}
