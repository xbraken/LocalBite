'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMenu } from '@/hooks/useMenu'
import { getCategoryStyle } from '@/lib/categoryStyles'
import { formatPrice, formatOrderId } from '@/lib/utils'
import { ItemCustomiserModal } from '@/components/ordering/ItemCustomiserModal'
import { UKAddressFields } from '@/components/checkout/UKAddressFields'
import { computeDeliveryFee, type DeliveryConfig } from '@/lib/delivery'
import type { MenuItem } from '@/types/menu'
import type { BasketItem } from '@/types/order'

const NOTE_PRESETS = ['No chilli', 'Extra sauce', 'Gluten free', 'No nuts', 'Well done', 'Less salt']
const VAT_RATE = 0.20

export default function KioskPage() {
  const { menu } = useMenu()
  const categories = Object.keys(menu)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [fulfillment, setFulfillment] = useState<'collection' | 'delivery'>('collection')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [addressValid, setAddressValid] = useState(false)
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)
  const [outOfRange, setOutOfRange] = useState(false)
  const [deliveryCfg, setDeliveryCfg] = useState<DeliveryConfig | null>(null)
  const [ticket, setTicket] = useState<BasketItem[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)
  const [paymentModal, setPaymentModal] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<{ orderId: number } | null>(null)

  useEffect(() => {
    if (categories.length > 0 && activeCategory === 'All') return
    if (categories.length > 0 && !categories.includes(activeCategory)) setActiveCategory('All')
  }, [categories.join(',')])

  useEffect(() => {
    const tenantQ = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
    const url = tenantQ ? `/api/delivery-config?tenant=${tenantQ}` : '/api/delivery-config'
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.delivery) setDeliveryCfg(json.delivery) })
      .catch(() => {})
  }, [])

  const allItems: MenuItem[] = useMemo(() => {
    return categories.flatMap((cat) => menu[cat] ?? [])
  }, [menu, categories.join(',')])

  const displayedItems = useMemo(() => {
    const base = activeCategory === 'All' ? allItems : (menu[activeCategory] ?? [])
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
  }, [allItems, activeCategory, search, menu])

  const ticketSubtotal = ticket.reduce((s, i) => s + i.totalPrice * i.qty, 0)
  const ticketVat = ticketSubtotal * VAT_RATE
  const deliveryFee = (fulfillment === 'delivery' && distanceMiles !== null && deliveryCfg && !outOfRange)
    ? computeDeliveryFee(distanceMiles, deliveryCfg)
    : 0
  const ticketTotal = ticketSubtotal + deliveryFee
  const ticketCount = ticket.reduce((s, i) => s + i.qty, 0)

  const addToTicket = (item: BasketItem) => {
    setTicket((prev) => {
      const exists = prev.find((t) => t.basketId === item.basketId)
      if (exists) return prev.map((t) => t.basketId === item.basketId ? { ...t, qty: t.qty + 1 } : t)
      return [...prev, item]
    })
    setFocusedId(item.basketId)
  }

  const updateQty = (basketId: string, delta: number) => {
    setTicket((prev) => prev.map((t) => t.basketId === basketId ? { ...t, qty: t.qty + delta } : t).filter((t) => t.qty > 0))
    if (delta < 0) setFocusedId(null)
  }

  const voidItem = (basketId: string) => {
    setTicket((prev) => prev.filter((t) => t.basketId !== basketId))
    setNotes((prev) => { const n = { ...prev }; delete n[basketId]; return n })
    if (focusedId === basketId) setFocusedId(null)
  }

  const voidAll = () => {
    setTicket([])
    setNotes({})
    setFocusedId(null)
  }

  const toggleNote = (basketId: string, note: string) => {
    setNotes((prev) => {
      const current = prev[basketId] ?? ''
      const parts = current ? current.split(', ') : []
      const next = parts.includes(note) ? parts.filter((p) => p !== note) : [...parts, note]
      return { ...prev, [basketId]: next.join(', ') }
    })
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setModalItem(item)
    } else {
      const bid = `${item.id}_${Date.now()}`
      addToTicket({ basketId: bid, itemId: item.id, name: item.name, basePrice: item.basePrice, selectedModifiers: [], totalPrice: item.basePrice, qty: 1, customisationLabel: '' })
    }
  }

  const submitOrder = async () => {
    if (ticket.length === 0) return
    if (fulfillment === 'delivery' && (!customerName || !customerPhone || !addressValid)) return
    setSubmitting(true)
    try {
      const itemsWithNotes = ticket.map((i) => ({ ...i, customisationLabel: [i.customisationLabel, notes[i.basketId]].filter(Boolean).join(' · ') }))
      const tenantQ = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
      const url = tenantQ ? `/api/orders?tenant=${tenantQ}` : '/api/orders'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Kiosk',
          customerPhone: customerPhone || undefined,
          customerAddress: fulfillment === 'delivery' ? customerAddress : undefined,
          fulfillmentType: fulfillment,
          items: itemsWithNotes,
          subtotal: ticketSubtotal,
          discountAmount: 0,
          total: ticketTotal,
          paymentMethod: 'cash',
        }),
      })
      const { orderId } = await res.json()
      setConfirmation({ orderId })
      setTicket([])
      setNotes({})
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setAddressValid(false)
      setPaymentModal(false)
    } catch { /* silent */ } finally { setSubmitting(false) }
  }

  if (confirmation) {
    return (
      <div style={{ height: '100vh', background: '#0C0C0C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 56 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2ECC71' }}>Order Sent to Kitchen</div>
        <div style={{ fontSize: 14, color: '#78726C' }}>{formatOrderId(confirmation.orderId)}</div>
        <button onClick={() => setConfirmation(null)} style={{ marginTop: 16, padding: '13px 36px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #D4A017, #C0392B)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          New Order
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0C0C0C', fontFamily: 'inherit' }}>

      {/* ── LEFT: item picker ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: '#0C0C0C', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a4440', fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '9px 12px 9px 34px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          {/* Fulfillment toggle */}
          <div style={{ display: 'flex', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            {(['collection', 'delivery'] as const).map((f) => (
              <button key={f} onClick={() => setFulfillment(f)} style={{ padding: '9px 16px', border: 'none', background: fulfillment === f ? '#D4A017' : 'transparent', color: fulfillment === f ? '#0C0C0C' : '#5a5450', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                {f === 'collection' ? 'Collection' : 'Delivery'}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', background: '#0C0C0C', borderBottom: '1px solid #1a1a1a', padding: '0 12px', flexShrink: 0, overflowX: 'auto' }}>
          {['All', ...categories].map((cat) => {
            const isActive = cat === activeCategory
            const accent = cat === 'All' ? '#D4A017' : getCategoryStyle(cat).accent
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '11px 16px', border: 'none', borderBottom: `2px solid ${isActive ? accent : 'transparent'}`, background: 'transparent', color: isActive ? accent : '#5a5450', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                {cat}
              </button>
            )
          })}
        </div>

        {/* Item grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {displayedItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#3a3430', fontSize: 13 }}>No items found</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
              {displayedItems.map((item) => {
                const cs = getCategoryStyle(item.category)
                const inTicket = ticket.filter((t) => String(t.itemId) === String(item.id)).reduce((s, t) => s + t.qty, 0)
                return (
                  <button key={item.id} onClick={() => handleItemClick(item)} style={{ background: '#111', border: `1px solid ${inTicket > 0 ? '#2a2420' : '#161616'}`, borderRadius: 10, padding: '14px', cursor: 'pointer', position: 'relative', textAlign: 'left', fontFamily: 'inherit', transition: 'border-color 0.1s' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: cs.accent, marginBottom: 8 }}>{item.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3', lineHeight: 1.3, marginBottom: 8 }}>{item.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: cs.accent }}>{formatPrice(item.basePrice)}</div>
                    {inTicket > 0 && (
                      <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: '#D4A017', color: '#0C0C0C', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {inTicket}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: order ticket ── */}
      <div style={{ width: 300, background: '#0f0f0f', borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Ticket header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EBE3' }}>Order Ticket</div>
            <div style={{ fontSize: 11, color: '#4a4440', marginTop: 2 }}>
              {fulfillment === 'collection' ? 'Collection' : 'Delivery'}{ticketCount > 0 ? ` · ${ticketCount} item${ticketCount !== 1 ? 's' : ''}` : ''}
            </div>
          </div>
          {ticket.length > 0 && (
            <button onClick={voidAll} style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 5, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Void all
            </button>
          )}
        </div>

        {/* Ticket items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {ticket.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#2a2a2a', fontSize: 12 }}>Tap items to add</div>
          ) : (
            ticket.map((item) => {
              const isFocused = focusedId === item.basketId
              const itemNote = notes[item.basketId] ?? ''
              return (
                <div key={item.basketId} onClick={() => setFocusedId(isFocused ? null : item.basketId)} style={{ borderBottom: '1px solid #111', cursor: 'pointer', background: isFocused ? 'rgba(212,160,23,0.04)' : 'transparent', borderLeft: isFocused ? '2px solid #D4A017' : '2px solid transparent' }}>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Qty controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); updateQty(item.basketId, 1) }} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #252525', background: '#1a1a1a', color: '#D4A017', cursor: 'pointer', fontSize: 14, lineHeight: 1, fontFamily: 'inherit', fontWeight: 700 }}>+</button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3', minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateQty(item.basketId, -1) }} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #252525', background: '#1a1a1a', color: '#78726C', cursor: 'pointer', fontSize: 14, lineHeight: 1, fontFamily: 'inherit', fontWeight: 700 }}>−</button>
                    </div>
                    {/* Name + note */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#F0EBE3', lineHeight: 1.3 }}>{item.name}</div>
                      {itemNote && <div style={{ fontSize: 10, color: '#4a85c8', marginTop: 3 }}>↳ {itemNote}</div>}
                    </div>
                    {/* Price + void */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3' }}>{formatPrice(item.totalPrice * item.qty)}</span>
                      <button onClick={(e) => { e.stopPropagation(); voidItem(item.basketId) }} style={{ fontSize: 9, fontWeight: 700, color: '#C0392B', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>void</button>
                    </div>
                  </div>

                  {/* Note presets — show when focused */}
                  {isFocused && (
                    <div style={{ padding: '0 14px 12px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3430', marginBottom: 6 }}>Add note</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {NOTE_PRESETS.map((note) => {
                          const active = itemNote.split(', ').includes(note)
                          return (
                            <button key={note} onClick={() => toggleNote(item.basketId, note)} style={{ fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 5, border: `1px solid ${active ? '#4a85c8' : '#252525'}`, background: active ? 'rgba(74,133,200,0.15)' : '#1a1a1a', color: active ? '#6ab0f5' : '#5a5450', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                              {note}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Customer details */}
        {ticket.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '9px 11px', color: '#F0EBE3', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '9px 11px', color: '#F0EBE3', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            {fulfillment === 'delivery' && (
              <UKAddressFields
                value={customerAddress}
                origin={deliveryCfg ? { postcode: deliveryCfg.originPostcode, radiusMiles: deliveryCfg.radiusMiles } : null}
                onChange={({ formatted, valid, distanceMiles, outOfRange }) => {
                  setCustomerAddress(formatted)
                  setAddressValid(valid)
                  setDistanceMiles(distanceMiles)
                  setOutOfRange(outOfRange)
                }}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
          {ticket.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#4a4440' }}>Subtotal</span>
                <span style={{ fontSize: 12, color: '#78726C' }}>{formatPrice(ticketSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#4a4440' }}>VAT (20%)</span>
                <span style={{ fontSize: 12, color: '#78726C' }}>incl.</span>
              </div>
              {fulfillment === 'delivery' && deliveryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#4a4440' }}>Delivery{distanceMiles !== null ? ` (${distanceMiles.toFixed(1)} mi)` : ''}</span>
                  <span style={{ fontSize: 12, color: '#78726C' }}>{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#F0EBE3' }}>Total</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A017' }}>{formatPrice(ticketTotal)}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => ticket.length > 0 && setPaymentModal(true)}
            disabled={ticket.length === 0}
            style={{ width: '100%', padding: '13px 0', borderRadius: 9, border: 'none', background: ticket.length === 0 ? '#1a1a1a' : 'linear-gradient(135deg, #D4A017, #C0392B)', color: ticket.length === 0 ? '#3a3430' : '#fff', fontSize: 13, fontWeight: 800, cursor: ticket.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {ticket.length === 0 ? 'Take Payment' : `Take Payment · ${formatPrice(ticketTotal)}`}
          </button>
        </div>
      </div>

      {/* Customiser modal */}
      {modalItem && (
        <ItemCustomiserModal item={modalItem} onAdd={(item) => { addToTicket(item); setModalItem(null) }} onClose={() => setModalItem(null)} />
      )}

      {/* Payment modal */}
      {paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(6px)' }} onClick={() => setPaymentModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EBE3', marginBottom: 4 }}>Take Payment</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#D4A017', marginBottom: 20 }}>{formatPrice(ticketTotal)}</div>

            <div style={{ fontSize: 11, color: '#4a4440', marginBottom: 8 }}>Cash received</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              {[ticketTotal, Math.ceil(ticketTotal / 5) * 5, 10, 20].map((amt) => (
                <button key={amt} onClick={() => setCashAmount(String(amt.toFixed(2)))} style={{ padding: '9px 0', borderRadius: 7, border: '1px solid #252525', background: cashAmount === String(amt.toFixed(2)) ? 'rgba(212,160,23,0.15)' : '#1a1a1a', color: cashAmount === String(amt.toFixed(2)) ? '#D4A017' : '#78726C', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {formatPrice(amt)}
                </button>
              ))}
            </div>

            <input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Enter amount..." type="number" step="0.01" style={{ width: '100%', background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '12px', color: '#F0EBE3', fontSize: 16, fontWeight: 700, outline: 'none', fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }} />

            {cashAmount && parseFloat(cashAmount) >= ticketTotal && (
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', color: '#2ECC71' }}>
                Change: {formatPrice(Math.max(0, parseFloat(cashAmount) - ticketTotal))}
              </div>
            )}
            {cashAmount && parseFloat(cashAmount) < ticketTotal && (
              <div style={{ fontSize: 12, marginBottom: 16, color: '#C0392B' }}>Short by {formatPrice(ticketTotal - parseFloat(cashAmount))}</div>
            )}

            <button onClick={submitOrder} disabled={submitting || !cashAmount || parseFloat(cashAmount) < ticketTotal} style={{ width: '100%', padding: '14px 0', borderRadius: 9, border: 'none', background: (!cashAmount || parseFloat(cashAmount) < ticketTotal) ? '#252525' : 'linear-gradient(135deg, #D4A017, #C0392B)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              {submitting ? 'Processing...' : `Charge ${formatPrice(ticketTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
