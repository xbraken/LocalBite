'use client'

import { useState } from 'react'
import { useMenu } from '@/hooks/useMenu'
import { getCategoryStyle } from '@/lib/categoryStyles'
import { formatPrice, formatOrderId } from '@/lib/utils'
import { ItemCustomiserModal } from '@/components/ordering/ItemCustomiserModal'
import type { MenuItem } from '@/types/menu'
import type { BasketItem } from '@/types/order'

interface TicketItem extends BasketItem {}

export default function KioskPage() {
  const { menu } = useMenu()
  const categories = Object.keys(menu)
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? '')
  const [ticket, setTicket] = useState<TicketItem[]>([])
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)
  const [paymentModal, setPaymentModal] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<{ orderId: number } | null>(null)

  const ticketTotal = ticket.reduce((s, i) => s + i.totalPrice * i.qty, 0)
  const change = cashAmount ? parseFloat(cashAmount) - ticketTotal : 0

  const addToTicket = (item: BasketItem) => {
    setTicket((prev) => {
      const exists = prev.find((t) => t.basketId === item.basketId)
      if (exists) return prev.map((t) => t.basketId === item.basketId ? { ...t, qty: t.qty + 1 } : t)
      return [...prev, item]
    })
  }

  const updateQty = (basketId: string, delta: number) => {
    setTicket((prev) => {
      const updated = prev.map((t) => t.basketId === basketId ? { ...t, qty: t.qty + delta } : t)
      return updated.filter((t) => t.qty > 0)
    })
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.modifierGroups.length > 0) {
      setModalItem(item)
    } else {
      addToTicket({
        basketId: `${item.id}_${Date.now()}`,
        itemId: item.id,
        name: item.name,
        basePrice: item.basePrice,
        selectedModifiers: [],
        totalPrice: item.basePrice,
        qty: 1,
        customisationLabel: '',
      })
    }
  }

  const submitOrder = async () => {
    if (ticket.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Kiosk',
          fulfillmentType: 'collection',
          items: ticket,
          subtotal: ticketTotal,
          discountAmount: 0,
          total: ticketTotal,
          paymentMethod: 'cash',
        }),
      })
      const { orderId } = await res.json()
      setConfirmation({ orderId })
      setTicket([])
      setPaymentModal(false)
    } catch {
      // handle error
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div style={{ height: '100vh', background: '#0C0C0C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#2ECC71' }}>Order Sent to Kitchen</div>
        <div style={{ fontSize: 16, color: '#78726C' }}>{formatOrderId(confirmation.orderId)}</div>
        <button
          onClick={() => setConfirmation(null)}
          style={{ marginTop: 20, padding: '14px 40px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #D4A017, #C0392B)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          New Order
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0C0C0C' }}>
      {/* Left: item picker */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#0f0f0f', borderBottom: '1px solid #1a1a1a', padding: '0 8px', flexShrink: 0, overflowX: 'auto' }}>
          {categories.map((cat) => {
            const cs = getCategoryStyle(cat)
            const isActive = cat === activeCategory
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '14px 20px',
                  border: 'none',
                  borderBottom: `3px solid ${isActive ? cs.accent : 'transparent'}`,
                  background: 'transparent',
                  color: isActive ? cs.accent : '#5a5450',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  transition: 'all 0.1s',
                }}
              >
                {cs.icon} {cat}
              </button>
            )
          })}
        </div>

        {/* Items grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {(menu[activeCategory] ?? []).map((item) => {
              const cs = getCategoryStyle(item.category)
              const inTicket = ticket.filter((t) => String(t.itemId) === String(item.id)).reduce((s, t) => s + t.qty, 0)
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    background: '#161616',
                    border: '1px solid #222',
                    borderRadius: 10,
                    padding: 0,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  {/* Image */}
                  <div style={{ height: 100, background: cs.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                    {cs.icon}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3', lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: cs.accent }}>{formatPrice(item.basePrice)}</div>
                  </div>
                  {inTicket > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#D4A017',
                      color: '#0C0C0C',
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {inTicket}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: order ticket */}
      <div style={{ width: 280, background: '#0f0f0f', borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1a1a1a', fontSize: 14, fontWeight: 800, color: '#F0EBE3' }}>
          Order Ticket
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {ticket.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#2a2a2a', fontSize: 12 }}>Tap items to add</div>
          ) : (
            ticket.map((item) => (
              <div key={item.basketId} style={{ padding: '10px 14px', borderBottom: '1px solid #111' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#F0EBE3', flex: 1 }}>{item.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#D4A017' }}>{formatPrice(item.totalPrice * item.qty)}</span>
                </div>
                {item.customisationLabel && (
                  <div style={{ fontSize: 10, color: '#4a4440', marginBottom: 6 }}>{item.customisationLabel}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQty(item.basketId, -1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #252525', background: '#1a1a1a', color: '#78726C', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>−</button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3', minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.basketId, 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #252525', background: '#1a1a1a', color: '#78726C', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px', borderTop: '1px solid #1a1a1a' }}>
          {ticket.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#78726C' }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#F0EBE3' }}>{formatPrice(ticketTotal)}</span>
            </div>
          )}
          <button
            onClick={() => ticket.length > 0 && setPaymentModal(true)}
            disabled={ticket.length === 0}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 9,
              border: 'none',
              background: ticket.length === 0 ? '#1a1a1a' : 'linear-gradient(135deg, #D4A017, #C0392B)',
              color: ticket.length === 0 ? '#3a3430' : '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: ticket.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Take Payment{ticket.length > 0 ? ` · ${formatPrice(ticketTotal)}` : ''}
          </button>
        </div>
      </div>

      {/* Customiser modal */}
      {modalItem && (
        <ItemCustomiserModal
          item={modalItem}
          onAdd={(item) => { addToTicket(item); setModalItem(null) }}
          onClose={() => setModalItem(null)}
        />
      )}

      {/* Payment modal */}
      {paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(6px)' }}
          onClick={() => setPaymentModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EBE3', marginBottom: 6 }}>Take Payment</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#D4A017', marginBottom: 20 }}>{formatPrice(ticketTotal)}</div>

            {/* Preset cash amounts */}
            <div style={{ fontSize: 11, color: '#4a4440', marginBottom: 8 }}>Cash received</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              {[ticketTotal, Math.ceil(ticketTotal), 10, 20].map((amt) => (
                <button key={amt} onClick={() => setCashAmount(String(amt.toFixed(2)))} style={{ padding: '9px 0', borderRadius: 7, border: '1px solid #252525', background: cashAmount === String(amt.toFixed(2)) ? 'rgba(212,160,23,0.15)' : '#1a1a1a', color: cashAmount === String(amt.toFixed(2)) ? '#D4A017' : '#78726C', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {formatPrice(amt)}
                </button>
              ))}
            </div>

            <input
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="Enter amount..."
              type="number"
              step="0.01"
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '12px', color: '#F0EBE3', fontSize: 16, fontWeight: 700, outline: 'none', fontFamily: 'inherit', marginBottom: 12 }}
            />

            {cashAmount && parseFloat(cashAmount) >= ticketTotal && (
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', color: '#2ECC71' }}>
                Change: {formatPrice(Math.max(0, parseFloat(cashAmount) - ticketTotal))}
              </div>
            )}

            {cashAmount && parseFloat(cashAmount) < ticketTotal && (
              <div style={{ fontSize: 12, marginBottom: 16, color: '#C0392B' }}>
                Short by {formatPrice(ticketTotal - parseFloat(cashAmount))}
              </div>
            )}

            <button
              onClick={submitOrder}
              disabled={submitting || !cashAmount || parseFloat(cashAmount) < ticketTotal}
              style={{ width: '100%', padding: '14px 0', borderRadius: 9, border: 'none', background: (!cashAmount || parseFloat(cashAmount) < ticketTotal) ? '#252525' : 'linear-gradient(135deg, #D4A017, #C0392B)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {submitting ? 'Processing...' : `Charge ${formatPrice(ticketTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
