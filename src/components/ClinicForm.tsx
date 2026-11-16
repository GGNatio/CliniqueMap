import { useState, type FormEvent } from 'react'
import { geocodeAddress } from '../lib/geocode'
import type { ClinicInput } from '../hooks/useClinics'
import type { Clinic, ClinicCategory } from '../types'
import { CATEGORY_LABELS } from '../types'

interface ClinicFormProps {
  initial?: Clinic | null
  onSubmit: (input: ClinicInput) => void
  onCancel: () => void
}

export function ClinicForm({ initial, onSubmit, onCancel }: ClinicFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [category, setCategory] = useState<ClinicCategory>(
    initial?.category ?? 'urgence',
  )
  const [lat, setLat] = useState(initial?.lat?.toString() ?? '')
  const [lng, setLng] = useState(initial?.lng?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function locateAddress() {
    setError(null)
    setBusy(true)
    try {
      const result = await geocodeAddress(address)
      if (!result) {
        setError('Adresse introuvable. Vérifiez l’orthographe ou saisissez lat/lng.')
        return
      }
      setLat(String(result.lat))
      setLng(String(result.lng))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de géocodage.')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedLat = Number(lat)
    const parsedLng = Number(lng)

    if (!name.trim() || !address.trim()) {
      setError('Nom et adresse sont obligatoires.')
      return
    }
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setError('Localisez l’adresse ou saisissez des coordonnées valides.')
      return
    }

    onSubmit({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
      lat: parsedLat,
      lng: parsedLng,
    })
  }

  return (
    <form className="clinic-form" onSubmit={handleSubmit}>
      <h3>{initial ? 'Modifier la clinique' : 'Ajouter une clinique'}</h3>

      <label>
        Nom
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Urgences Vétérinaires Lyon"
          required
        />
      </label>

      <label>
        Catégorie
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ClinicCategory)}
        >
          {(Object.keys(CATEGORY_LABELS) as ClinicCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Adresse
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          placeholder="Adresse complète ou ville"
          required
        />
      </label>

      <button
        type="button"
        className="btn btn--ghost"
        onClick={locateAddress}
        disabled={busy || !address.trim()}
      >
        {busy ? 'Localisation…' : 'Localiser sur la carte'}
      </button>

      <div className="clinic-form__coords">
        <label>
          Latitude
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            placeholder="45.75"
          />
        </label>
        <label>
          Longitude
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            inputMode="decimal"
            placeholder="4.85"
          />
        </label>
      </div>

      <label>
        Téléphone
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="04 XX XX XX XX"
        />
      </label>

      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Horaires, particularités…"
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="clinic-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn--primary">
          Enregistrer
        </button>
      </div>
    </form>
  )
}
