'use client'

import { useEffect, useRef, useState } from 'react'
import { haversineMiles } from '@/lib/delivery'

export interface AddressChangePayload {
  formatted: string
  valid: boolean
  distanceMiles: number | null
  outOfRange: boolean
}

interface Props {
  value: string
  onChange: (payload: AddressChangePayload) => void
  origin?: { postcode: string | null; radiusMiles: number } | null
}

interface PostcodeResult {
  postcode: string
  admin_district: string
  admin_ward: string
  region: string | null
  latitude: number
  longitude: number
}

interface NominatimHit {
  display_name: string
  lat: string
  lon: string
  address?: {
    house_number?: string
    road?: string
    neighbourhood?: string
    suburb?: string
    village?: string
    town?: string
    city?: string
    postcode?: string
  }
}

type Status = 'idle' | 'checking' | 'valid' | 'invalid'

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

function formatPostcode(raw: string) {
  const stripped = raw.replace(/\s+/g, '').toUpperCase()
  if (stripped.length < 5) return stripped
  return `${stripped.slice(0, -3)} ${stripped.slice(-3)}`
}

function hitStreet(h: NominatimHit): string {
  const a = h.address ?? {}
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  return street || h.display_name.split(',')[0]
}

function hitCity(h: NominatimHit): string {
  const a = h.address ?? {}
  return a.city ?? a.town ?? a.village ?? a.suburb ?? a.neighbourhood ?? ''
}

export function UKAddressFields({ onChange, origin }: Props) {
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [suggestions, setSuggestions] = useState<NominatimHit[]>([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [lookingUp, setLookingUp] = useState(false)
  const [line1Focused, setLine1Focused] = useState(false)

  const postcodeDebounceRef = useRef<number | null>(null)
  const suggestDebounceRef = useRef<number | null>(null)
  const suppressNextLookupRef = useRef(false)

  useEffect(() => {
    const pc = origin?.postcode?.replace(/\s+/g, '').toUpperCase()
    if (!pc) { setOriginCoords(null); return }
    fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.result) setOriginCoords({ lat: json.result.latitude, lng: json.result.longitude })
      })
      .catch(() => {})
  }, [origin?.postcode])

  // Postcode validation → postcodes.io
  useEffect(() => {
    const pc = postcode.trim()
    if (!pc) { setStatus('idle'); setError(''); return }
    if (!POSTCODE_RE.test(pc)) { setStatus('invalid'); setError('Postcode format looks off'); return }

    setStatus('checking')
    setError('')
    if (postcodeDebounceRef.current) window.clearTimeout(postcodeDebounceRef.current)
    postcodeDebounceRef.current = window.setTimeout(async () => {
      try {
        const normalised = pc.replace(/\s+/g, '')
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`)
        if (!res.ok) {
          setStatus('invalid')
          setError('Postcode not found')
          return
        }
        const { result } = (await res.json()) as { result: PostcodeResult }
        setStatus('valid')
        setCoords({ lat: result.latitude, lng: result.longitude })
        if (!city) setCity(result.admin_district)
      } catch {
        setStatus('invalid')
        setError('Could not verify postcode')
      }
    }, 350)

    return () => {
      if (postcodeDebounceRef.current) window.clearTimeout(postcodeDebounceRef.current)
    }
  }, [postcode])

  // Address typeahead → OpenStreetMap Nominatim
  useEffect(() => {
    if (suppressNextLookupRef.current) {
      suppressNextLookupRef.current = false
      return
    }
    const q = line1.trim()
    if (q.length < 3 || !line1Focused) {
      setSuggestions([])
      setSuggestOpen(false)
      return
    }

    if (suggestDebounceRef.current) window.clearTimeout(suggestDebounceRef.current)
    suggestDebounceRef.current = window.setTimeout(async () => {
      setLookingUp(true)
      try {
        const params = new URLSearchParams({
          q: postcode ? `${q}, ${postcode}` : q,
          format: 'json',
          countrycodes: 'gb',
          addressdetails: '1',
          limit: '6',
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
        if (!res.ok) return
        const json = (await res.json()) as NominatimHit[]
        setSuggestions(json)
        setSuggestOpen(json.length > 0)
        setActiveIndex(-1)
      } catch {
        /* ignore */
      } finally {
        setLookingUp(false)
      }
    }, 400)

    return () => {
      if (suggestDebounceRef.current) window.clearTimeout(suggestDebounceRef.current)
    }
  }, [line1, postcode, line1Focused])

  const pickSuggestion = (h: NominatimHit) => {
    suppressNextLookupRef.current = true
    setLine1(hitStreet(h))
    const c = hitCity(h)
    if (c) setCity(c)
    const pc = h.address?.postcode
    if (pc) setPostcode(formatPostcode(pc))
    const lat = parseFloat(h.lat)
    const lng = parseFloat(h.lon)
    if (!isNaN(lat) && !isNaN(lng)) setCoords({ lat, lng })
    if (pc) setStatus('valid')
    setSuggestOpen(false)
    setSuggestions([])
  }

  useEffect(() => {
    const parts = [line1.trim(), line2.trim(), city.trim(), postcode.trim()].filter(Boolean)
    const formatted = parts.join(', ')
    const baseValid = line1.trim().length > 0 && status === 'valid'
    let distanceMiles: number | null = null
    let outOfRange = false
    if (coords && originCoords) {
      distanceMiles = haversineMiles(originCoords, coords)
      if (origin && distanceMiles > origin.radiusMiles) outOfRange = true
    }
    const valid = baseValid && !outOfRange
    onChange({ formatted, valid, distanceMiles, outOfRange })
  }, [line1, line2, city, postcode, status, coords, originCoords, origin, onChange])

  const pcBorder = status === 'valid' ? '#2ECC71' : status === 'invalid' ? '#C0392B' : '#252525'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
        <span style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Address line 1</span>
        <div style={{ position: 'relative' }}>
          <input
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            onFocus={() => { setLine1Focused(true); if (suggestions.length > 0) setSuggestOpen(true) }}
            onBlur={() => { setTimeout(() => { setSuggestOpen(false); setLine1Focused(false) }, 150) }}
            onKeyDown={(e) => {
              if (!suggestOpen) return
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
              else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); pickSuggestion(suggestions[activeIndex]) }
              else if (e.key === 'Escape') setSuggestOpen(false)
            }}
            placeholder="Start typing an address…"
            autoComplete="off"
            style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
          {lookingUp && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#78726C' }}>…</span>
          )}
        </div>
        {suggestOpen && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#0f0f0f', border: '1px solid #252525', borderRadius: 8, boxShadow: '0 16px 32px rgba(0,0,0,0.45)', zIndex: 50, maxHeight: 280, overflowY: 'auto' }}>
            {suggestions.map((h, i) => (
              <button
                key={`${h.lat}-${h.lon}-${i}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pickSuggestion(h) }}
                onMouseEnter={() => setActiveIndex(i)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: i === activeIndex ? '#1a1a1a' : 'transparent', border: 'none', padding: '10px 12px', color: '#F0EBE3', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #161616' : 'none' }}
              >
                <div style={{ fontWeight: 600 }}>{hitStreet(h)}</div>
                <div style={{ fontSize: 11, color: '#78726C', marginTop: 2 }}>
                  {[hitCity(h), h.address?.postcode].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}
          </div>
        )}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Address line 2 <span style={{ color: '#3a3430' }}>(optional)</span></span>
        <input
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Flat 4B"
          style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Postcode</span>
          <div style={{ position: 'relative' }}>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              onBlur={(e) => setPostcode(formatPostcode(e.target.value))}
              placeholder="SW1A 1AA"
              autoComplete="postal-code"
              style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1a', border: `1px solid ${pcBorder}`, borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            />
            {status === 'checking' && (
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#78726C' }}>…</span>
            )}
            {status === 'valid' && (
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#2ECC71' }}>✓</span>
            )}
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Town / City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Auto-filled"
            style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
        </label>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: '#E88070' }}>{error}</div>
      )}
      {status === 'valid' && coords && originCoords && origin && (() => {
        const miles = haversineMiles(originCoords, coords)
        const over = miles > origin.radiusMiles
        if (!over) return null
        return (
          <div style={{ fontSize: 11, color: '#E88070' }}>
            Out of range — {miles.toFixed(1)} mi away (max {origin.radiusMiles.toFixed(1)} mi)
          </div>
        )
      })()}
    </div>
  )
}
