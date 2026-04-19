'use client'

import { formatPrice } from '@/lib/utils'
import type { BasketItem } from '@/types/order'
import { useRouter } from 'next/navigation'

interface BasketSidebarProps {
  items: BasketItem[]
  onRemove: (basketId: string) => void
  onUpdateQty: (basketId: string, qty: number) => void
  subtotal: number
}

export function BasketSidebar({ items, onRemove, onUpdateQty, subtotal }: BasketSidebarProps) {
  const router = useRouter()
  const isEmpty = items.length === 0

  return (
    <aside
      style={{
        width: 260,
        background: '#0f0f0f',
        borderLeft: '1px solid #1a1a1a',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#F0EBE3' }}>Your Order</div>
        {!isEmpty && (
          <div style={{ fontSize: 11, color: '#78726C', marginTop: 2 }}>
            {items.reduce((s, i) => s + i.qty, 0)} item{items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {isEmpty ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
            <div style={{ fontSize: 12, color: '#3a3430' }}>Your basket is empty</div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.basketId}
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #111',
              }}
            >
              {/* Item name + remove */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#F0EBE3', lineHeight: 1.3 }}>{item.name}</div>
                  {item.customisationLabel && (
                    <div style={{ fontSize: 10, color: '#5a5450', marginTop: 2, lineHeight: 1.4 }}>
                      {item.customisationLabel}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemove(item.basketId)}
                  style={{ background: 'none', border: 'none', color: '#3a3430', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>

              {/* Qty + price */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                {/* Qty controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => onUpdateQty(item.basketId, item.qty - 1)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#1a1a1a',
                      border: '1px solid #252525',
                      color: '#78726C',
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'inherit',
                    }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3', minWidth: 12, textAlign: 'center' }}>
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.basketId, item.qty + 1)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#1a1a1a',
                      border: '1px solid #252525',
                      color: '#78726C',
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'inherit',
                    }}
                  >
                    +
                  </button>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D4A017' }}>
                  {formatPrice(item.totalPrice * item.qty)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #1a1a1a' }}>
        {!isEmpty && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#78726C' }}>Subtotal</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#F0EBE3' }}>{formatPrice(subtotal)}</span>
          </div>
        )}
        <button
          onClick={() => {
            if (isEmpty) return
            const t = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
            router.push(t ? `/checkout?tenant=${t}` : '/checkout')
          }}
          disabled={isEmpty}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 9,
            border: 'none',
            background: isEmpty ? '#1a1a1a' : 'linear-gradient(135deg, #D4A017, #C0392B)',
            color: isEmpty ? '#3a3430' : '#fff',
            fontSize: 13,
            fontWeight: 800,
            cursor: isEmpty ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
        >
          {isEmpty ? 'Add items to checkout' : `Checkout · ${formatPrice(subtotal)}`}
        </button>
      </div>
    </aside>
  )
}
