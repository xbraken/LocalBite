'use client'

import { KitchenCard } from './KitchenCard'
import type { Order } from '@/types/order'

interface Column {
  key: string
  label: string
  icon: string
  color: string
  border: string
  bg: string
  headerBg: string
}

const COLUMNS: Column[] = [
  { key: 'new', label: 'New Orders', icon: '🔔', color: '#F97316', border: 'rgba(249,115,22,0.35)', bg: 'linear-gradient(180deg, rgba(249,115,22,0.09), rgba(249,115,22,0.03))', headerBg: 'rgba(249,115,22,0.08)' },
  { key: 'preparing', label: 'In Progress', icon: '👨‍🍳', color: '#EAB308', border: 'rgba(234,179,8,0.35)', bg: 'linear-gradient(180deg, rgba(234,179,8,0.09), rgba(234,179,8,0.03))', headerBg: 'rgba(234,179,8,0.08)' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: '🛍️', color: '#C08434', border: 'rgba(192,132,52,0.35)', bg: 'linear-gradient(180deg, rgba(192,132,52,0.08), rgba(192,132,52,0.03))', headerBg: 'rgba(192,132,52,0.08)' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵', color: '#38BDF8', border: 'rgba(56,189,248,0.35)', bg: 'linear-gradient(180deg, rgba(56,189,248,0.08), rgba(56,189,248,0.03))', headerBg: 'rgba(56,189,248,0.08)' },
  { key: 'complete', label: 'Complete', icon: '✓', color: '#22C55E', border: 'rgba(34,197,94,0.3)', bg: 'linear-gradient(180deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))', headerBg: 'rgba(34,197,94,0.08)' },
]

interface KanbanBoardProps {
  orders: Order[]
  onUpdateStatus: (orderId: number, status: string) => void
}

export function KanbanBoard({ orders, onUpdateStatus }: KanbanBoardProps) {
  return (
    <>
      <style>{`
        .kitchen-board {
          display: grid;
          grid-template-columns: repeat(5, minmax(220px, 1fr));
          gap: 16px;
          height: 100%;
          padding: 20px;
          overflow: auto;
          align-content: start;
        }

        .kitchen-column {
          min-height: 0;
          background: var(--col-bg);
          border: 1px solid var(--col-border);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .kitchen-column-header {
          padding: 16px 18px;
          border-bottom: 1px solid var(--col-border);
          background: var(--col-header-bg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
        }

        .kitchen-column-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .kitchen-column-icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          font-size: 18px;
          flex-shrink: 0;
        }

        .kitchen-column-labels {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .kitchen-column-title {
          font-size: 15px;
          line-height: 1.1;
          font-weight: 800;
          color: #F6F1E8;
          letter-spacing: 0.01em;
        }

        .kitchen-column-subtitle {
          margin-top: 3px;
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
          color: var(--col-color);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .kitchen-column-count {
          min-width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.28);
          color: #F6F1E8;
          border-radius: 999px;
          padding: 0 12px;
          font-size: 16px;
          font-weight: 800;
          border: 1px solid var(--col-border);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .kitchen-column-cards {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kitchen-column-empty {
          text-align: center;
          padding: 24px 0;
          color: #2a2a2a;
          font-size: 12px;
        }

        @media (max-width: 1365px) {
          .kitchen-board {
            grid-template-columns: repeat(3, minmax(240px, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .kitchen-board {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            height: auto;
          }

          .kitchen-column {
            min-height: 320px;
            max-height: 48vh;
          }
        }

        @media (max-width: 640px) {
          .kitchen-board {
            grid-template-columns: 1fr;
            padding: 14px;
            gap: 12px;
          }

          .kitchen-column {
            max-height: none;
          }

          .kitchen-column-header {
            padding: 12px 14px;
          }

          .kitchen-column-icon {
            width: 34px;
            height: 34px;
            font-size: 16px;
          }

          .kitchen-column-title {
            font-size: 14px;
          }

          .kitchen-column-count {
            min-width: 34px;
            height: 34px;
            font-size: 14px;
          }
        }
      `}</style>

      <div className="kitchen-board">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key)
          return (
            <div
              key={col.key}
              className="kitchen-column"
              style={{
                ['--col-bg' as string]: col.bg,
                ['--col-border' as string]: col.border,
                ['--col-color' as string]: col.color,
                ['--col-header-bg' as string]: col.headerBg,
              }}
            >
              <div className="kitchen-column-header">
                <div className="kitchen-column-heading">
                  <span className="kitchen-column-icon" aria-hidden="true">{col.icon}</span>
                  <div className="kitchen-column-labels">
                    <span className="kitchen-column-title">{col.label}</span>
                    <span className="kitchen-column-subtitle">Status</span>
                  </div>
                </div>
                <span className="kitchen-column-count">{colOrders.length}</span>
              </div>

              <div className="kitchen-column-cards">
                {colOrders.length === 0 && (
                  <div className="kitchen-column-empty">
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
    </>
  )
}
