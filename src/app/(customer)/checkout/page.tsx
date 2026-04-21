'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBasket } from '@/hooks/useBasket'
import { formatPrice } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UKAddressFields } from '@/components/checkout/UKAddressFields'
import { computeDeliveryFee, type DeliveryConfig } from '@/lib/delivery'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearBasket } = useBasket()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressValid, setAddressValid] = useState(false)
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)
  const [outOfRange, setOutOfRange] = useState(false)
  const [deliveryCfg, setDeliveryCfg] = useState<DeliveryConfig | null>(null)
  const [notes, setNotes] = useState('')
  const [fulfillment, setFulfillment] = useState<'collection' | 'delivery'>('collection')
  const [dealCode, setDealCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [discountMsg, setDiscountMsg] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const deliveryFee = (fulfillment === 'delivery' && distanceMiles !== null && deliveryCfg)
    ? computeDeliveryFee(distanceMiles, deliveryCfg)
    : 0
  const total = Math.max(0, subtotal - discount + deliveryFee)

  const apiPath = (base: string) => {
    if (typeof window === 'undefined') return base
    const t = new URLSearchParams(window.location.search).get('tenant')
    return t ? `${base}?tenant=${t}` : base
  }

  useEffect(() => {
    fetch(apiPath('/api/delivery-config'))
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.delivery) setDeliveryCfg(json.delivery) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyDeal = async () => {
    if (!dealCode) return
    const res = await fetch(apiPath('/api/deals'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: dealCode, subtotal }),
    })
    const data = await res.json()
    if (data.valid) {
      const amt = data.discountType === 'percent'
        ? subtotal * (data.discountValue / 100)
        : data.discountValue
      setDiscount(amt)
      setDiscountMsg(`Code applied — saving ${formatPrice(amt)}`)
    } else {
      setDiscountMsg(data.reason ?? 'Invalid code')
      setDiscount(0)
    }
  }

  const submit = async () => {
    if (!name) { setError('Please enter your name'); return }
    if (!phone) { setError('Please enter your phone number'); return }
    if (items.length === 0) { setError('Your basket is empty'); return }
    if (fulfillment === 'delivery' && !deliveryCfg?.enabled) { setError('Delivery is not available from this restaurant'); return }
    if (fulfillment === 'delivery' && outOfRange) { setError('Address is outside the delivery radius'); return }
    if (fulfillment === 'delivery' && !addressValid) { setError('Please enter a valid delivery address with a UK postcode'); return }
    if (fulfillment === 'delivery' && deliveryCfg && subtotal < deliveryCfg.minOrder) { setError(`Minimum delivery order is ${formatPrice(deliveryCfg.minOrder)}`); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(apiPath('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone || undefined,
          customerAddress: fulfillment === 'delivery' ? address : undefined,
          fulfillmentType: fulfillment,
          items,
          dealCode: dealCode || undefined,
          deliveryFee: fulfillment === 'delivery' ? deliveryFee : 0,
          // Deprecated fields kept for backwards compatibility while server canonicalizes pricing
          subtotal,
          discountAmount: discount,
          total,
          paymentMethod,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to place order')
      const { orderId } = await res.json()
      clearBasket()
      const t = new URLSearchParams(window.location.search).get('tenant')
      router.push(`/confirmation/${orderId}${t ? `?tenant=${t}` : ''}`)
    } catch (e) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#080808', borderBottom: '1px solid #1a1a1a', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#78726C', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}
        >
          ←
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3' }}>Checkout</span>
      </div>

      <div style={{ display: 'flex', flex: 1, maxWidth: 900, margin: '0 auto', padding: '32px 24px', gap: 32, width: '100%' }}>
        {/* Left: form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Fulfillment toggle */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', marginBottom: 10 }}>Fulfillment</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['collection', 'delivery'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFulfillment(type)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 8,
                    border: `1.5px solid ${fulfillment === type ? '#D4A017' : '#252525'}`,
                    background: fulfillment === type ? 'rgba(212,160,23,0.1)' : 'transparent',
                    color: fulfillment === type ? '#D4A017' : '#5a5450',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontFamily: 'inherit',
                    transition: 'all 0.1s',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Customer details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>Your details</div>
            <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            <Input label="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44..." type="tel" />
            {fulfillment === 'delivery' && (
              <div>
                <div style={{ fontSize: 12, color: '#78726C', fontWeight: 500, marginBottom: 8 }}>Delivery address</div>
                <UKAddressFields
                  value={address}
                  origin={deliveryCfg ? { postcode: deliveryCfg.originPostcode, radiusMiles: deliveryCfg.radiusMiles } : null}
                  onChange={({ formatted, valid, distanceMiles, outOfRange }) => {
                    setAddress(formatted)
                    setAddressValid(valid)
                    setDistanceMiles(distanceMiles)
                    setOutOfRange(outOfRange)
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
                rows={2}
                style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', marginBottom: 10 }}>Payment</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['card', 'cash'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 8,
                    border: `1.5px solid ${paymentMethod === method ? '#D4A017' : '#252525'}`,
                    background: paymentMethod === method ? 'rgba(212,160,23,0.1)' : 'transparent',
                    color: paymentMethod === method ? '#D4A017' : '#5a5450',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontFamily: 'inherit',
                    transition: 'all 0.1s',
                  }}
                >
                  {method === 'card' ? '💳 Card' : '💵 Cash'}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: '#C0392B', padding: '8px 12px', background: 'rgba(192,57,43,0.1)', borderRadius: 6 }}>{error}</div>}
        </div>

        {/* Right: order summary */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20, position: 'sticky', top: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3', marginBottom: 16 }}>Order Summary</div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {items.map((item) => (
                <div key={item.basketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#F0EBE3' }}>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</div>
                    {item.customisationLabel && (
                      <div style={{ fontSize: 10, color: '#4a4440' }}>{item.customisationLabel}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#78726C', flexShrink: 0 }}>{formatPrice(item.totalPrice * item.qty)}</span>
                </div>
              ))}
            </div>

            {/* Deal code */}
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={dealCode}
                  onChange={(e) => setDealCode(e.target.value.toUpperCase())}
                  placeholder="Deal code"
                  style={{ flex: 1, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 6, padding: '8px 10px', color: '#F0EBE3', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                />
                <button
                  onClick={applyDeal}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #D4A017', background: 'transparent', color: '#D4A017', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Apply
                </button>
              </div>
              {discountMsg && (
                <div style={{ fontSize: 11, marginTop: 6, color: discount > 0 ? '#2ECC71' : '#C0392B' }}>{discountMsg}</div>
              )}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #1a1a1a', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78726C' }}>
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#2ECC71' }}>
                  <span>Discount</span><span>−{formatPrice(discount)}</span>
                </div>
              )}
              {fulfillment === 'delivery' && distanceMiles !== null && !outOfRange && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78726C' }}>
                  <span>Delivery</span><span>{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#F0EBE3', paddingTop: 8, borderTop: '1px solid #1a1a1a' }}>
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={loading || items.length === 0}
              className="w-full mt-4 py-3 text-sm"
            >
              {loading ? 'Placing order...' : `Place Order · ${formatPrice(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
