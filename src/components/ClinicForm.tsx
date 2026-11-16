import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { geocodeAddress, suggestPlaces, type PlaceLookup } from '../lib/geocode'
import type { ClinicInput } from '../hooks/useClinics'
import type { Clinic, ClinicCategory } from '../types'
import { CATEGORY_LABELS } from '../types'

interface ClinicFormProps {
  initial?: Clinic | null
  onSubmit: (input: ClinicInput) => void
  onCancel: () => void
}

export function ClinicForm({ initial, onSubmit, onCancel }: ClinicFormProps) {
  const listId = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [category, setCategory] = useState<ClinicCategory>(
    initial?.category ?? 'urgence',
  )
  const [lat, setLat] = useState(initial?.lat?.toString() ?? '')
  const [lng, setLng] = useState(initial?.lng?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<PlaceLookup[]>([])
  const [openSuggest, setOpenSuggest] = useState(false)
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const skipSuggestRef = useRef(false)

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false
      return
    }

    const q = name.trim()
    if (q.length < 3) {
      setSuggestions([])
      setLoadingSuggest(false)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoadingSuggest(true)
      try {
        const results = await suggestPlaces(q, controller.signal)
        if (!controller.signal.aborted) {
          setSuggestions(results)
          setOpenSuggest(true)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLoadingSuggest(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [name])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenSuggest(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function applyPlace(place: PlaceLookup) {
    skipSuggestRef.current = true
    setName(place.name)
    setAddress(place.address)
    setLat(String(place.lat))
    setLng(String(place.lng))
    if (place.phone) setPhone(place.phone)
    if (place.email) setEmail(place.email)
    setSuggestions([])
    setOpenSuggest(false)

    const missing: string[] = []
    if (!place.phone) missing.push('téléphone')
    if (!place.email) missing.push('email')
    setInfo(
      missing.length
        ? `Fiche trouvée. Manquant dans OpenStreetMap : ${missing.join(', ')}.`
        : 'Fiche trouvée : adresse, téléphone et email remplis.',
    )
    setError(null)
  }

  async function searchPlace() {
    setError(null)
    setInfo(null)
    if (name.trim().length < 3) {
      setError('Saisissez au moins 3 caractères pour rechercher la clinique.')
      return
    }
    setBusy(true)
    try {
      const results = await suggestPlaces(name)
      if (!results.length) {
        setError('Aucune clinique trouvée. Affinez le nom ou remplissez à la main.')
        setSuggestions([])
        return
      }
      setSuggestions(results)
      setOpenSuggest(true)
      if (results.length === 1) applyPlace(results[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de recherche.')
    } finally {
      setBusy(false)
    }
  }

  async function locateAddress() {
    setError(null)
    setInfo(null)
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
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
      lat: parsedLat,
      lng: parsedLng,
    })
  }

  return (
    <form className="clinic-form" onSubmit={handleSubmit}>
      <h3>{initial ? 'Modifier la clinique' : 'Ajouter une clinique'}</h3>

      <label htmlFor="clinic-name">Nom</label>
      <div className="clinic-form__name-row" ref={wrapRef}>
        <div className="address-suggest">
          <input
            id="clinic-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => {
              if (suggestions.length) setOpenSuggest(true)
            }}
            placeholder="Ex. Clinique Vétérinaire l'Arche des Nacs"
            required
            autoComplete="off"
            role="combobox"
            aria-expanded={openSuggest}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          {openSuggest && (suggestions.length > 0 || loadingSuggest) && (
            <ul id={listId} className="address-suggest__list" role="listbox">
              {loadingSuggest && suggestions.length === 0 && (
                <li className="address-suggest__empty">Recherche…</li>
              )}
              {suggestions.map((item) => (
                <li key={`${item.lat}-${item.lng}-${item.name}`}>
                  <button
                    type="button"
                    role="option"
                    className="address-suggest__item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyPlace(item)}
                  >
                    <strong>{item.name}</strong>
                    <span className="address-suggest__meta">{item.address}</span>
                    {(item.phone || item.email) && (
                      <span className="address-suggest__meta">
                        {[item.phone, item.email].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void searchPlace()}
          disabled={busy || name.trim().length < 3}
        >
          {busy ? '…' : 'Rechercher'}
        </button>
      </div>
      <p className="panel__hint">
        Tapez le nom puis choisissez une suggestion, ou cliquez Rechercher.
        Téléphone / email uniquement s’ils existent sur OpenStreetMap.
      </p>

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
        onClick={() => void locateAddress()}
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
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@clinique.fr"
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

      {info && <p className="form-info">{info}</p>}
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
