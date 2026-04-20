'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function tenantParam() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('tenant')
}

function apiPath(base: string) {
  const t = tenantParam()
  return t ? `${base}?tenant=${t}` : base
}

interface DeliveryCfg {
  enabled: boolean
  originPostcode: string | null
  radiusMiles: number
  baseFee: number
  perMileFee: number
  minOrder: number
}

interface RestaurantResponse {
  restaurant: {
    name: string
    contactEmail: string | null
    contactPhone: string | null
    delivery?: DeliveryCfg
  }
}

export function SettingsTab() {
  const { data, mutate } = useSWR<RestaurantResponse>(apiPath('/api/restaurant'), fetcher)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Delivery
  const [deliveryEnabled, setDeliveryEnabled] = useState(true)
  const [originPostcode, setOriginPostcode] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('3')
  const [baseFee, setBaseFee] = useState('2.50')
  const [perMileFee, setPerMileFee] = useState('0.80')
  const [minOrder, setMinOrder] = useState('0')
  const [deliverySaved, setDeliverySaved] = useState(false)
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [deliveryError, setDeliveryError] = useState('')

  useEffect(() => {
    if (!data?.restaurant) return
    setName(data.restaurant.name ?? '')
    setEmail(data.restaurant.contactEmail ?? '')
    setPhone(data.restaurant.contactPhone ?? '')
    if (data.restaurant.delivery) {
      const d = data.restaurant.delivery
      setDeliveryEnabled(d.enabled)
      setOriginPostcode(d.originPostcode ?? '')
      setRadiusMiles(String(d.radiusMiles))
      setBaseFee(d.baseFee.toFixed(2))
      setPerMileFee(d.perMileFee.toFixed(2))
      setMinOrder(String(d.minOrder))
    }
  }, [data])

  const save = async () => {
    setSaving(true)
    await fetch(apiPath('/api/restaurant'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        contactEmail: email || null,
        contactPhone: phone || null,
      }),
    })
    await mutate()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveDelivery = async () => {
    setDeliveryError('')
    const radius = parseFloat(radiusMiles)
    const base = parseFloat(baseFee)
    const perMile = parseFloat(perMileFee)
    const min = parseFloat(minOrder)
    if ([radius, base, perMile, min].some((v) => isNaN(v) || v < 0)) {
      setDeliveryError('All delivery numbers must be zero or positive')
      return
    }
    setDeliverySaving(true)
    const res = await fetch(apiPath('/api/restaurant'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryEnabled,
        deliveryOriginPostcode: originPostcode.trim() || null,
        deliveryRadiusMiles: radius,
        deliveryBaseFee: base,
        deliveryPerMileFee: perMile,
        deliveryMinOrder: min,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setDeliveryError(typeof j.error === 'string' ? j.error : 'Failed to save delivery settings')
    } else {
      await mutate()
      setDeliverySaved(true)
      setTimeout(() => setDeliverySaved(false), 2000)
    }
    setDeliverySaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>Settings</h2>

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 24, maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', marginBottom: 4 }}>Restaurant Details</div>
        <Input label="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Golden Panda" />
        <Input label="Contact email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@restaurant.com" type="email" />
        <Input label="Contact phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44..." type="tel" />

        <Button onClick={save} className="mt-2">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
        </Button>
      </div>

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 24, maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>Delivery</div>
            <div style={{ fontSize: 11, color: '#78726C', marginTop: 2 }}>
              Configure delivery radius and fees. Distance is calculated from your shop postcode to the customer's UK postcode.
            </div>
          </div>
          <Toggle on={deliveryEnabled} onChange={(v) => setDeliveryEnabled(v)} />
        </div>

        {deliveryEnabled && (
          <>
            <Input
              label="Shop postcode (delivery origin)"
              value={originPostcode}
              onChange={(e) => setOriginPostcode(e.target.value.toUpperCase())}
              placeholder="SW1A 1AA"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Max radius (miles)" value={radiusMiles} onChange={(e) => setRadiusMiles(e.target.value)} placeholder="3" type="number" />
              <Input label="Min order (£)" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="15" type="number" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Base fee (£)" value={baseFee} onChange={(e) => setBaseFee(e.target.value)} placeholder="2.50" type="number" />
              <Input label="Per mile (£)" value={perMileFee} onChange={(e) => setPerMileFee(e.target.value)} placeholder="0.80" type="number" />
            </div>
            <div style={{ fontSize: 11, color: '#78726C', background: '#111', border: '1px solid #1a1a1a', borderRadius: 7, padding: '9px 11px' }}>
              Example at 2 mi: £{((parseFloat(baseFee) || 0) + (parseFloat(perMileFee) || 0) * 2).toFixed(2)} delivery fee
            </div>
          </>
        )}

        {deliveryError && (
          <div style={{ fontSize: 12, color: '#E88070', padding: '8px 11px', borderRadius: 7, background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.25)' }}>{deliveryError}</div>
        )}

        <Button onClick={saveDelivery}>
          {deliverySaving ? 'Saving…' : deliverySaved ? '✓ Saved!' : 'Save Delivery Settings'}
        </Button>
      </div>
    </div>
  )
}
