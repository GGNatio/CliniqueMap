import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { ClientLocation, Clinic, ClinicWithDistance } from '../types'
import { CATEGORY_LABELS } from '../types'
import { formatDistance } from '../lib/geo'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix des icônes Leaflet sous Vite/Electron
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const FRANCE_CENTER: [number, number] = [46.6, 2.4]

function clientIcon() {
  return L.divIcon({
    className: 'map-pin map-pin--client',
    html: '<span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function clinicIcon(category: Clinic['category']) {
  return L.divIcon({
    className: `map-pin map-pin--${category}`,
    html: '<span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function FitBounds({
  client,
  clinics,
}: {
  client: ClientLocation | null
  clinics: ClinicWithDistance[]
}) {
  const map = useMap()

  useEffect(() => {
    if (client && clinics.length > 0) {
      const bounds = L.latLngBounds([
        [client.lat, client.lng],
        ...clinics.slice(0, 8).map((c) => [c.lat, c.lng] as [number, number]),
      ])
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
      return
    }

    if (client) {
      map.setView([client.lat, client.lng], 11)
      return
    }

    if (clinics.length > 0) {
      const bounds = L.latLngBounds(
        clinics.map((c) => [c.lat, c.lng] as [number, number]),
      )
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 })
    }
  }, [client, clinics, map])

  return null
}

interface MapViewProps {
  client: ClientLocation | null
  clinics: ClinicWithDistance[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function MapView({
  client,
  clinics,
  selectedId,
  onSelect,
}: MapViewProps) {
  return (
    <MapContainer
      center={FRANCE_CENTER}
      zoom={6}
      className="map-view"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds client={client} clinics={clinics} />

      {client && (
        <Marker position={[client.lat, client.lng]} icon={clientIcon()}>
          <Popup>
            <strong>Client</strong>
            <br />
            {client.label}
          </Popup>
        </Marker>
      )}

      {clinics.map((clinic) => (
        <Marker
          key={clinic.id}
          position={[clinic.lat, clinic.lng]}
          icon={clinicIcon(clinic.category)}
          eventHandlers={{ click: () => onSelect(clinic.id) }}
          opacity={selectedId && selectedId !== clinic.id ? 0.55 : 1}
        >
          <Popup>
            <strong>{clinic.name}</strong>
            <br />
            {CATEGORY_LABELS[clinic.category]}
            <br />
            {clinic.address}
            {clinic.distanceKm != null && Number.isFinite(clinic.distanceKm) && (
              <>
                <br />
                {formatDistance(clinic.distanceKm)}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
