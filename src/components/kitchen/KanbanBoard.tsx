'use client'

import { KitchenCard } from './KitchenCard'
import type { Order } from '@/types/order'

interface Column {
  key: string
  label: string
  color: string
  border: string
  bg: string
}

const COLUMNS: Column[] = [
  { key: 'new', label: 'New Orders', color: '#C0392B', border: 'rgba(192,57,43,0.45)', bg: 'rgba(192,57,43,0.04)' },
  { key: 'preparing', label: 'In Progress', color: '#D4A017', border: 'rgba(212,160,23,0.4)', bg: 'rgba(212,160,23,0.03)' },
  { key: 'complete', label: 'Complete', color: '#2ECC71', border: 'rgba(46,204,113,0.25)', bg: 'rgba(46,204,113,0.02)' },
]

interface KanbanBoardProps {
  orders: Order[]
  onUpdateStatus: (orderId: number, status: string) => void
}

export function KanbanBoard({ orders, onUpdateStatus }: KanbanBoardProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, height: '100%', padding: 20, overflow: 'hidden' }}>
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.key)
        return (
          <div
            key={col.key}
            style={{
              background: col.bg,
              border: `1px solid ${col.border}`,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${col.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
              <span style={{
                background: `${col.color}22`,
                color: col.color,
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {colOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colOrders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#2a2a2a', fontSize: 12 }}>
                  No orders
                </div>
              )}
              {colOrders.map((order) => (
                <KitchenCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
