'use client'

import { ElapsedTimer } from './ElapsedTimer'
import { formatOrderId, formatPrice } from '@/lib/utils'
import type { Order } from '@/types/order'

interface KitchenCardProps {
  order: Order
  onUpdateStatus: (orderId: number, status: string) => void
}

const COLUMN_STYLES = {
  new: { border: 'rgba(192,57,43,0.45)', accent: '#C0392B', bg: 'rgba(192,57,43,0.06)' },
  preparing: { border: 'rgba(212,160,23,0.4)', accent: '#D4A017', bg: 'rgba(212,160,23,0.05)' },
  complete: { border: 'rgba(46,204,113,0.25)', accent: '#2ECC71', bg: 'rgba(46,204,113,0.04)' },
}

export function KitchenCard({ order, onUpdateStatus }: KitchenCardProps) {
  const colStyle = COLUMN_STYLES[order.status as keyof typeof COLUMN_STYLES] ?? COLUMN_STYLES.new
  const isDone = order.status === 'complete'

  return (
    <div
      style={{
        background: colStyle.bg,
        border: `1px solid ${colStyle.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: isDone ? 0.5 : 1,
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#F0EBE3' }}>{formatOrderId(order.id)}</span>
          <span style={{ fontSize: 11, color: '#78726C', marginLeft: 8 }}>{order.customerName}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <ElapsedTimer createdAt={order.createdAt} />
          <span style={{ fontSize: 10, color: '#3a3430', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {order.fulfillmentType}
          </span>
        </div>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {order.itemsSnapshot.map((item, i) => (
          <div key={i} style={{ fontSize: 12, color: '#C8C4BC', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: '#F0EBE3' }}>
              {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
            </span>
            {item.selectedModifiers.length > 0 && (
              <div style={{ fontSize: 11, color: '#5a5450', paddingLeft: 8, marginTop: 1 }}>
                {item.selectedModifiers.map((m) => m.optionName).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ fontSize: 11, color: '#4a4440', borderTop: '1px solid #1a1a1a', paddingTop: 8 }}>
        Total: <span style={{ fontWeight: 700, color: '#78726C' }}>{formatPrice(order.total)}</span>
      </div>

      {/* Actions */}
      {!isDone && (
        <div style={{ display: 'flex', gap: 8 }}>
          {order.status === 'new' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'preparing')}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 7,
                border: `1px solid ${colStyle.accent}44`,
                background: `${colStyle.accent}18`,
                color: colStyle.accent,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.1s',
              }}
            >
              Preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'complete')}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 7,
                border: '1px solid rgba(46,204,113,0.4)',
                background: 'rgba(46,204,113,0.15)',
                color: '#2ECC71',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.1s',
              }}
            >
              ✓ Mark Complete
            </button>
          )}
        </div>
      )}

      {isDone && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#2ECC71', textAlign: 'center', padding: '8px 0' }}>
          ✓ Done
        </div>
      )}
    </div>
  )
}
