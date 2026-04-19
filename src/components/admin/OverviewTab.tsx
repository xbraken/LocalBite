'use client'

import useSWR from 'swr'
import { StatusBadge } from '@/components/ui/Badge'
import { formatPrice, formatOrderId } from '@/lib/utils'
import type { Order } from '@/types/order'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function tenantParam() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('tenant')
}

function apiPath(base: string) {
  const t = tenantParam()
  return t ? `${base}?tenant=${t}` : base
}

export function AdminOverview() {
  const { data } = useSWR<{ orders: Order[] }>(apiPath('/api/orders'), fetcher, { refreshInterval: 30000 })
  const orders = data?.orders ?? []

  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)
  const avgOrder = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0

  const kpis = [
    { label: 'Orders Today', value: todayOrders.length, color: '#D4A017' },
    { label: 'Revenue Today', value: formatPrice(todayRevenue), color: '#2ECC71' },
    { label: 'Avg Order Value', value: formatPrice(avgOrder), color: '#3B82F6' },
    { label: 'Active Now', value: orders.filter((o) => o.status !== 'complete' && o.status !== 'cancelled').length, color: '#C0392B' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3', marginBottom: 20 }}>Overview</h2>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
            background: '#0f0f0f',
            border: '1px solid #1a1a1a',
            borderRadius: 10,
            padding: '18px 20px',
          }}>
            <div style={{ fontSize: 11, color: '#78726C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>Recent Orders</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              {['Order', 'Customer', 'Total', 'Method', 'Status', 'Time'].map((h) => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#4a4440', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#F0EBE3' }}>{formatOrderId(order.id)}</td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: '#C8C4BC' }}>{order.customerName}</td>
                <td style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#D4A017' }}>{formatPrice(order.total)}</td>
                <td style={{ padding: '12px 20px', fontSize: 11, color: '#78726C', textTransform: 'capitalize' }}>{order.paymentMethod}</td>
                <td style={{ padding: '12px 20px' }}><StatusBadge status={order.status} /></td>
                <td style={{ padding: '12px 20px', fontSize: 11, color: '#4a4440' }}>
                  {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#2a2a2a', fontSize: 12 }}>No orders yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
