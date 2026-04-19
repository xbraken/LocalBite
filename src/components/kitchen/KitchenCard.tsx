'use client'

import { ElapsedTimer } from './ElapsedTimer'
import { formatOrderId, formatPrice } from '@/lib/utils'
import type { Order } from '@/types/order'

interface KitchenCardProps {
  order: Order
  onUpdateStatus: (orderId: number, status: string) => void
}

const COLUMN_STYLES = {
  new: { border: 'rgba(249,115,22,0.35)', accent: '#F97316', bg: 'rgba(249,115,22,0.08)' },
  preparing: { border: 'rgba(234,179,8,0.35)', accent: '#EAB308', bg: 'rgba(234,179,8,0.07)' },
  ready_for_pickup: { border: 'rgba(192,132,52,0.35)', accent: '#C08434', bg: 'rgba(192,132,52,0.08)' },
  out_for_delivery: { border: 'rgba(56,189,248,0.35)', accent: '#38BDF8', bg: 'rgba(56,189,248,0.08)' },
  complete: { border: 'rgba(34,197,94,0.3)', accent: '#22C55E', bg: 'rgba(34,197,94,0.06)' },
}

export function KitchenCard({ order, onUpdateStatus }: KitchenCardProps) {
  const colStyle = COLUMN_STYLES[order.status as keyof typeof COLUMN_STYLES] ?? COLUMN_STYLES.new
  const isDone = order.status === 'complete'
  const preparingCta = order.fulfillmentType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup'
  const preparingNextStatus = order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'ready_for_pickup'

  return (
    <>
      <style>{`
        .kitchen-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          opacity: var(--card-opacity);
        }

        .kitchen-card-id {
          font-size: 18px;
          font-weight: 900;
          color: #F0EBE3;
          letter-spacing: 0.01em;
        }

        .kitchen-card-customer {
          font-size: 12px;
          color: #8D877F;
          font-weight: 600;
        }

        .kitchen-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .kitchen-card-orderline {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 6px 8px;
        }

        .kitchen-card-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }

        .kitchen-card-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .kitchen-card-item {
          font-size: 13px;
          color: #D5D0C8;
          line-height: 1.35;
        }

        .kitchen-card-item-name {
          font-weight: 700;
          color: #F0EBE3;
        }

        .kitchen-card-modifiers {
          font-size: 11px;
          color: #6F6962;
          padding-left: 8px;
          margin-top: 2px;
        }

        .kitchen-card-total {
          font-size: 11px;
          color: #5D5751;
          border-top: 1px solid #1a1a1a;
          padding-top: 8px;
        }

        .kitchen-card-total-value {
          font-weight: 800;
          color: #A8A198;
        }

        .kitchen-card-actions {
          display: flex;
          gap: 8px;
        }

        .kitchen-card-button {
          flex: 1;
          min-height: 44px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.1s;
          white-space: normal;
          text-align: center;
        }

        @media (max-width: 640px) {
          .kitchen-card {
            padding: 12px 14px;
          }

          .kitchen-card-meta {
            align-items: flex-start;
          }

          .kitchen-card-header {
            flex-direction: column;
          }

          .kitchen-card-id {
            font-size: 16px;
          }
        }
      `}</style>

      <div
        className="kitchen-card"
        style={{
          ['--card-bg' as string]: colStyle.bg,
          ['--card-border' as string]: colStyle.border,
          ['--card-opacity' as string]: isDone ? 0.5 : 1,
        }}
      >
      {/* Card header */}
      <div className="kitchen-card-header">
        <div>
          <div className="kitchen-card-orderline">
            <span className="kitchen-card-id">{formatOrderId(order.id)}</span>
            <span className="kitchen-card-customer">{order.customerName}</span>
          </div>
        </div>
        <div className="kitchen-card-meta">
          <ElapsedTimer createdAt={order.createdAt} />
          <span style={{ fontSize: 10, color: '#3a3430', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {order.fulfillmentType}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="kitchen-card-items">
        {order.itemsSnapshot.map((item, i) => (
          <div key={i} className="kitchen-card-item">
            <span className="kitchen-card-item-name">
              {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
            </span>
            {item.selectedModifiers.length > 0 && (
              <div className="kitchen-card-modifiers">
                {item.selectedModifiers.map((m) => m.optionName).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delivery address */}
      {order.fulfillmentType === 'delivery' && order.customerAddress && (
        <div style={{ fontSize: 11, color: '#9FC8F5', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 7, padding: '7px 10px', lineHeight: 1.4 }}>
          🛵 {order.customerAddress}
        </div>
      )}

      {/* Total */}
      <div className="kitchen-card-total">
        Total: <span className="kitchen-card-total-value">{formatPrice(order.total)}</span>
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="kitchen-card-actions">
          {order.status === 'new' && (
            <button
              className="kitchen-card-button"
              onClick={() => onUpdateStatus(order.id, 'preparing')}
              style={{
                border: `1px solid ${colStyle.accent}44`,
                background: `${colStyle.accent}18`,
                color: colStyle.accent,
              }}
            >
              Preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              className="kitchen-card-button"
              onClick={() => onUpdateStatus(order.id, preparingNextStatus)}
              style={{
                border: `1px solid ${preparingNextStatus === 'out_for_delivery' ? 'rgba(59,130,246,0.4)' : 'rgba(139,92,246,0.4)'}`,
                background: preparingNextStatus === 'out_for_delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                color: preparingNextStatus === 'out_for_delivery' ? '#3B82F6' : '#8B5CF6',
              }}
            >
              {preparingCta}
            </button>
          )}
          {(order.status === 'ready_for_pickup' || order.status === 'out_for_delivery') && (
            <button
              className="kitchen-card-button"
              onClick={() => onUpdateStatus(order.id, 'complete')}
              style={{
                border: '1px solid rgba(46,204,113,0.4)',
                background: 'rgba(46,204,113,0.15)',
                color: '#2ECC71',
              }}
            >
              {order.fulfillmentType === 'delivery' ? 'Delivered' : 'Collected'}
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
    </>
  )
}
