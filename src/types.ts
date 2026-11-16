export type ClinicCategory = 'urgence' | 'veterinaire'

export interface Clinic {
  id: string
  name: string
  address: string
  phone?: string
  notes?: string
  category: ClinicCategory
  lat: number
  lng: number
}

export interface ClientLocation {
  label: string
  lat: number
  lng: number
}

export interface ClinicWithDistance extends Clinic {
  distanceKm: number
}

export const CATEGORY_LABELS: Record<ClinicCategory, string> = {
  urgence: "Centre d'urgence",
  veterinaire: 'Clinique vétérinaire',
}
