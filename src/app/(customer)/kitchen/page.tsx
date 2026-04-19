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

  useEffect(() => {
    // Initial load of active orders
    fetch('/api/orders')
      .then((r) => r.json())
      .then(({ orders: rows }) => {
        if (rows) setOrders(rows.filter((o: Order) => o.status !== 'cancelled'))
      })
      .catch(() => {})

    // WebSocket
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws?tenantId=kitchen`)
    let reconnectDelay = 1000
    let reconnectTimer: ReturnType<typeof setTimeout>

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000)
      }, reconnectDelay)
    }
    ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data)
        if (event === 'order:new') {
          setOrders((prev) => [data, ...prev])
        }
        if (event === 'order:updated') {
          setOrders((prev) =>
            prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o))
          )
        }
      } catch {}
    }

    return () => {
      clearTimeout(reconnectTimer)
      ws.close()
    }
  }, [])

  const handleUpdateStatus = async (orderId: number, status: string) => {
    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)))

    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {
      // Revert on error by re-fetching
      fetch('/api/orders').then((r) => r.json()).then(({ orders: rows }) => {
        if (rows) setOrders(rows)
      })
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0C0C0C', overflow: 'hidden' }}>
      {/* Kitchen header */}
      <div style={{
        background: '#080808',
        borderBottom: '1px solid #1a1a1a',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
  )
}
