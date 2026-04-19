'use client'

import { useEffect, useState } from 'react'
import { KanbanBoard } from '@/components/kitchen/KanbanBoard'
import type { Order } from '@/types/order'

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [connected, setConnected] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    // Live clock
    const clockTick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    clockTick()
    const clockId = setInterval(clockTick, 1000)
    return () => clearInterval(clockId)
  }, [])

  const tenantParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
  const apiPath = (base: string) => tenantParam ? `${base}${base.includes('?') ? '&' : '?'}tenant=${tenantParam}` : base

  useEffect(() => {
    const ordersUrl = apiPath('/api/orders')

    const loadOrders = () => {
      fetch(ordersUrl)
        .then((r) => r.json())
        .then(({ orders: rows }) => {
          if (!rows) return
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const filtered = rows.filter((o: Order) => {
            if (o.status === 'cancelled') return false
            // Keep completed orders only if completed today (so the owner can review the day's throughput)
            if (o.status === 'complete') {
              const ts = new Date(String(o.createdAt).replace(' ', 'T') + 'Z')
              return ts >= todayStart
            }
            return true
          })
          setOrders(filtered)
        })
        .catch(() => {})
    }

    loadOrders()

    // Polling — works on Vercel (no WebSocket needed)
    const poll = setInterval(loadOrders, 4000)
    setConnected(true)

    return () => {
      clearInterval(poll)
      setConnected(false)
    }
  }, [])

  const handleUpdateStatus = async (orderId: number, status: string) => {
    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)))

    await fetch(apiPath(`/api/orders/${orderId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {
      fetch(apiPath('/api/orders')).then((r) => r.json()).then(({ orders: rows }) => {
        if (rows) setOrders(rows)
      })
    })
  }

  return (
    <>
      <style>{`
        .kitchen-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0C0C0C;
          overflow: hidden;
        }

        .kitchen-page-header {
          background: #080808;
          border-bottom: 1px solid #1a1a1a;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
        }

        .kitchen-page-status {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .kitchen-page-header {
            padding: 12px 14px;
            flex-wrap: wrap;
          }

          .kitchen-page-status {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="kitchen-page">
      {/* Kitchen header */}
      <div className="kitchen-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #D4A017, #C0392B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>🍽️</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3' }}>Kitchen Display</span>
        </div>

        <div className="kitchen-page-status">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#2ECC71' : '#C0392B' }} />
            <span style={{ fontSize: 11, color: connected ? '#2ECC71' : '#C0392B', fontWeight: 600 }}>
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <KanbanBoard orders={orders} onUpdateStatus={handleUpdateStatus} />
      </div>
      </div>
    </>
  )
}
