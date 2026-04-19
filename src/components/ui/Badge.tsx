import type { OrderStatus } from '@/types/order'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#C0392B', bg: 'rgba(192,57,43,0.15)' },
  preparing: { label: 'Preparing', color: '#D4A017', bg: 'rgba(212,160,23,0.12)' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  out_for_delivery: { label: 'Out for Delivery', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  complete: { label: 'Complete', color: '#2ECC71', bg: 'rgba(46,204,113,0.1)' },
  cancelled: { label: 'Cancelled', color: '#78726C', bg: 'rgba(120,114,108,0.12)' },
}

interface BadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: BadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}44`,
        textTransform: 'capitalize',
      }}
    >
      {cfg.label}
    </span>
  )
}

interface PlanBadgeProps {
  plan: string
}

const PLAN_CONFIG: Record<string, { color: string; bg: string }> = {
  starter: { color: '#78726C', bg: 'rgba(120,114,108,0.12)' },
  pro: { color: '#D4A017', bg: 'rgba(212,160,23,0.12)' },
  enterprise: { color: '#2ECC71', bg: 'rgba(46,204,113,0.1)' },
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const cfg = PLAN_CONFIG[plan.toLowerCase()] ?? PLAN_CONFIG.starter
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'capitalize',
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {plan}
    </span>
  )
}
