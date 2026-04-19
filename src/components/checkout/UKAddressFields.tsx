'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (formatted: string, valid: boolean) => void
}

interface PostcodeResult {
  postcode: string
  admin_district: string
  admin_ward: string
  region: string | null
}

type Status = 'idle' | 'checking' | 'valid' | 'invalid'

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

function formatPostcode(raw: string) {
  const stripped = raw.replace(/\s+/g, '').toUpperCase()
  if (stripped.length < 5) return stripped
  return `${stripped.slice(0, -3)} ${stripped.slice(-3)}`
}

export function UKAddressFields({ onChange }: Props) {
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const pc = postcode.trim()
    if (!pc) { setStatus('idle'); setError(''); return }
    if (!POSTCODE_RE.test(pc)) { setStatus('invalid'); setError('Postcode format looks off'); return }

    setStatus('checking')
    setError('')
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
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
        if (!city) setCity(result.admin_district)
      } catch {
        setStatus('invalid')
        setError('Could not verify postcode')
      }
    }, 350)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [postcode])

  useEffect(() => {
    const parts = [line1.trim(), line2.trim(), city.trim(), postcode.trim()].filter(Boolean)
    const formatted = parts.join(', ')
    const valid = line1.trim().length > 0 && status === 'valid'
    onChange(formatted, valid)
  }, [line1, line2, city, postcode, status, onChange])

  const pcBorder = status === 'valid' ? '#2ECC71' : status === 'invalid' ? '#C0392B' : '#252525'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Address line 1</span>
        <input
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="123 High Street"
          style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
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
            placeholder="Auto-filled from postcode"
            style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
        </label>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: '#E88070' }}>{error}</div>
      )}
      {status === 'valid' && (
        <div style={{ fontSize: 11, color: '#2ECC71' }}>Postcode verified</div>
      )}
    </div>
  )
}
