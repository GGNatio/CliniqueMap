import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { suggestAddresses, type GeocodeResult } from '../lib/geocode'

interface AddressSearchProps {
  searching: boolean
  onSearch: (query: string) => void
  onPick: (result: GeocodeResult) => void
}

export function AddressSearch({
  searching,
  onSearch,
  onPick,
}: AddressSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = query.trim()
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
        const results = await suggestAddresses(q, controller.signal)
        if (!controller.signal.aborted) {
          setSuggestions(results)
          setOpen(true)
          setActiveIndex(-1)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggest(false)
      }
    }, 280)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function pick(result: GeocodeResult) {
    setQuery(result.label)
    setSuggestions([])
    setOpen(false)
    onPick(result)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      pick(suggestions[activeIndex])
      return
    }
    setOpen(false)
    onSearch(query)
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <label htmlFor="client-address">Adresse ou ville du client</label>
      <div className="search-form__row" ref={wrapRef}>
        <div className="address-suggest">
          <input
            id="client-address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length) setOpen(true)
            }}
            onKeyDown={(e) => {
              if (!open || suggestions.length === 0) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => (i + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) =>
                  i <= 0 ? suggestions.length - 1 : i - 1,
                )
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Ex. 12 rue de la Paix, Lyon"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          {open && (suggestions.length > 0 || loadingSuggest) && (
            <ul id={listId} className="address-suggest__list" role="listbox">
              {loadingSuggest && suggestions.length === 0 && (
                <li className="address-suggest__empty">Recherche…</li>
              )}
              {suggestions.map((item, index) => (
                <li key={`${item.lat}-${item.lng}-${item.label}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={
                      index === activeIndex
                        ? 'address-suggest__item is-active'
                        : 'address-suggest__item'
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={searching || !query.trim()}
        >
          {searching ? '…' : 'Chercher'}
        </button>
      </div>
    </form>
  )
}
