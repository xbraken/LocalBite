'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { StatusBadge } from '@/components/ui/Badge'
import { formatPrice, formatOrderId } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types/order'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function tenantParam() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('tenant')
}

function apiPath(base: string) {
  const t = tenantParam()
  return t ? `${base}?tenant=${t}` : base
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready_for_pickup' },
  { label: 'Out', value: 'out_for_delivery' },
  { label: 'Complete', value: 'complete' },
]

export function AdminOrders() {
  const [filter, setFilter] = useState('all')
  const { data, mutate } = useSWR<{ orders: Order[] }>(apiPath('/api/orders'), fetcher, { refreshInterval: 15000 })
  const orders = data?.orders ?? []
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const updateStatus = async (orderId: number, status: OrderStatus) => {
    await fetch(apiPath(`/api/orders/${orderId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    mutate()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>Orders</h2>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: `1px solid ${filter === f.value ? '#D4A017' : '#252525'}`,
                background: filter === f.value ? 'rgba(212,160,23,0.1)' : 'transparent',
                color: filter === f.value ? '#D4A017' : '#5a5450',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              {['Order', 'Customer', 'Items', 'Total', 'Type', 'Status', 'Time', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#4a4440', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#F0EBE3' }}>{formatOrderId(order.id)}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#C8C4BC' }}>{order.customerName}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#78726C' }}>{order.itemsSnapshot.length}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#D4A017' }}>{formatPrice(order.total)}</td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: '#5a5450', textTransform: 'capitalize' }}>{order.fulfillmentType}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={order.status} /></td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: '#4a4440' }}>
                  {new Date(order.createdAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {order.status === 'new' && (
                    <button onClick={() => updateStatus(order.id, 'preparing')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.1)', color: '#D4A017', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Start
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'ready_for_pickup')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: `1px solid ${order.fulfillmentType === 'delivery' ? 'rgba(59,130,246,0.4)' : 'rgba(139,92,246,0.4)'}`, background: order.fulfillmentType === 'delivery' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)', color: order.fulfillmentType === 'delivery' ? '#3B82F6' : '#8B5CF6', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {order.fulfillmentType === 'delivery' ? 'Dispatch' : 'Ready'}
                    </button>
                  )}
                  {(order.status === 'ready_for_pickup' || order.status === 'out_for_delivery') && (
                    <button onClick={() => updateStatus(order.id, 'complete')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(46,204,113,0.4)', background: 'rgba(46,204,113,0.1)', color: '#2ECC71', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {order.fulfillmentType === 'delivery' ? 'Delivered' : 'Collected'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#2a2a2a', fontSize: 12 }}>No orders</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
