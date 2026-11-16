export interface GeocodeResult {
  label: string
  lat: number
  lng: number
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

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '6',
    countrycodes: 'fr,be,ch,lu',
    addressdetails: '1',
  })

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'fr',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Impossible de proposer des adresses pour le moment.')
  }

  const data = (await response.json()) as Array<{
    display_name: string
    lat: string
    lon: string
  }>

  return mapNominatim(data)
}

/** Géocodage exact (1 résultat) via Nominatim */
export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  const results = await suggestAddresses(query)
  return results[0] ?? null
}
