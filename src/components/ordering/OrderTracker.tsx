'use client'

import { useEffect, useState } from 'react'

type Status = 'new' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'complete' | 'cancelled'

interface Stage {
  key: Status
  label: string
  icon: string
  description: string
}

interface OrderTrackerProps {
  orderId: number
  initialStatus: Status
  fulfillmentType: 'collection' | 'delivery'
}

export function OrderTracker({ orderId, initialStatus, fulfillmentType }: OrderTrackerProps) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [prevStatus, setPrevStatus] = useState<Status>(initialStatus)
  const [justAdvanced, setJustAdvanced] = useState(false)

  const stages: Stage[] = [
    { key: 'new', label: 'Order received', icon: '📝', description: 'The restaurant has your order' },
    { key: 'preparing', label: 'Preparing your food', icon: '👨‍🍳', description: 'Freshly made just for you' },
    ...(fulfillmentType === 'delivery'
      ? [{ key: 'out_for_delivery' as const, label: 'Out for delivery', icon: '🛵', description: 'The driver is on the way' }]
      : [{ key: 'ready_for_pickup' as const, label: 'Ready to collect', icon: '🎉', description: 'Your order is ready for pickup' }]),
    {
      key: 'complete',
      label: fulfillmentType === 'delivery' ? 'Delivered' : 'Collected',
      icon: fulfillmentType === 'delivery' ? '✅' : '✅',
      description: fulfillmentType === 'delivery' ? 'Your order has been delivered' : 'Your order has been collected',
    },
  ]

  const currentIndex = Math.max(0, stages.findIndex((s) => s.key === status))

  // Poll for status changes
  useEffect(() => {
    if (status === 'complete' || status === 'cancelled') return

    const tenant = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
    const url = tenant ? `/api/orders/${orderId}?tenant=${tenant}` : `/api/orders/${orderId}`

    const poll = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const { order } = await res.json()
        if (order?.status && order.status !== status) {
          setPrevStatus(status)
          setStatus(order.status)
          setJustAdvanced(true)
          setTimeout(() => setJustAdvanced(false), 1200)
        }
      } catch {}
    }

    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [orderId, status])

  if (status === 'cancelled') {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: '#C0392B', fontSize: 13, fontWeight: 700 }}>
        This order was cancelled. Please contact the restaurant.
      </div>
    )
  }

  const activeStage = stages[currentIndex]

  return (
    <>
      {/* Inline keyframes */}
      <style>{`
        @keyframes tracker-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212,160,23,0.7); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(212,160,23,0); }
        }
        @keyframes tracker-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes tracker-bounce {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tracker-fill {
          from { width: 0%; }
          to { width: var(--fill, 100%); }
        }
      `}</style>

      {/* Active stage hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,160,23,0.12), rgba(192,57,43,0.08))',
        border: '1px solid rgba(212,160,23,0.25)',
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Shimmer overlay (only while in progress, not for complete state) */}
        {status !== 'complete' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.08) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'tracker-shimmer 2.6s linear infinite',
            pointerEvents: 'none',
          }} />
        )}
        <div
          key={`${activeStage.key}-${justAdvanced}`}
          style={{
            fontSize: 42,
            marginBottom: 8,
            animation: justAdvanced ? 'tracker-bounce 0.6s ease-out' : undefined,
            display: 'inline-block',
          }}
        >
          {activeStage.icon}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3', marginBottom: 4 }}>
          {activeStage.label}
        </div>
        <div style={{ fontSize: 12, color: '#78726C' }}>
          {activeStage.description}
        </div>
      </div>

      {/* Progress rail */}
      <div style={{ position: 'relative', padding: '8px 12px 28px' }}>
        {/* Background rail */}
        <div style={{
          position: 'absolute',
          top: 22,
          left: 34,
          right: 34,
          height: 2,
          background: '#1a1a1a',
          borderRadius: 2,
        }} />
        {/* Filled rail */}
        <div style={{
          position: 'absolute',
          top: 22,
          left: 34,
          height: 2,
          width: `calc(${(currentIndex / (stages.length - 1)) * 100}% - ${(currentIndex / (stages.length - 1)) * 68}px)`,
          background: 'linear-gradient(90deg, #D4A017, #C0392B)',
          borderRadius: 2,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 12px rgba(212,160,23,0.5)',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {stages.map((stage, i) => {
            const isDone = i < currentIndex
            const isActive = i === currentIndex
            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 90 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isDone ? '#2ECC71' : isActive ? '#D4A017' : '#111',
                  border: `2px solid ${isDone ? '#2ECC71' : isActive ? '#D4A017' : '#252525'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  color: isDone ? '#fff' : isActive ? '#0C0C0C' : '#3a3430',
                  fontWeight: 800,
                  animation: isActive && status !== 'complete' ? 'tracker-pulse 1.8s ease-in-out infinite' : undefined,
                  transition: 'all 0.4s',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 10,
                  color: isActive ? '#D4A017' : isDone ? '#78726C' : '#3a3430',
                  fontWeight: isActive ? 700 : 500,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
