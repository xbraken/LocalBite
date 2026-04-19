import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import { formatOrderId, formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { OrderTracker } from '@/components/ordering/OrderTracker'

export default async function ConfirmationPage({ params }: { params: { orderId: string } }) {
  const tenant = await getTenantFromRequest()
  if (!tenant) notFound()

  const orderId = parseInt(params.orderId)
  const order = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, tenant.id)))
    .get()

  if (!order) notFound()

  const snapshot = JSON.parse(order.itemsSnapshot)
  const estimatedMinutes = order.fulfillmentType === 'delivery' ? '30–45' : '15–20'

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: 32, maxWidth: 520, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F0EBE3' }}>Thanks for your order</div>
          <div style={{ fontSize: 12, color: '#78726C', marginTop: 4 }}>
            {formatOrderId(order.id)} · {estimatedMinutes} min estimated
          </div>
        </div>

        {/* Live tracker */}
        <OrderTracker
          orderId={order.id}
          initialStatus={order.status as 'new' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'complete' | 'cancelled'}
          fulfillmentType={(order.fulfillmentType ?? 'collection') as 'collection' | 'delivery'}
        />

        {/* Order items */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#78726C', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {snapshot.map((item: { name: string; qty: number; totalPrice: number; selectedModifiers: { optionName: string }[] }, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, color: '#F0EBE3', fontWeight: 600 }}>
                    {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                  </span>
                  <span style={{ fontSize: 13, color: '#D4A017', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                    {formatPrice(item.totalPrice * item.qty)}
                  </span>
                </div>
                {item.selectedModifiers.length > 0 && (
                  <div style={{ fontSize: 11, color: '#4a4440', marginTop: 2 }}>
                    {item.selectedModifiers.map((m: { optionName: string }) => m.optionName).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#F0EBE3' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A017' }}>{formatPrice(order.total)}</span>
          </div>
        </div>

        <Link
          href={`/?tenant=${tenant.subdomain}`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '13px 0',
            borderRadius: 9,
            background: 'linear-gradient(135deg, #D4A017, #C0392B)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          New Order
        </Link>
      </div>
    </div>
  )
}
