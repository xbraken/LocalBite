'use client'

import { FoodImgPlaceholder } from './FoodImgPlaceholder'
import { getCategoryStyle } from '@/lib/categoryStyles'
import { formatPrice } from '@/lib/utils'
import type { MenuItem } from '@/types/menu'

interface MenuCardProps {
  item: MenuItem
  onSelect: (item: MenuItem) => void
}

export function MenuCard({ item, onSelect }: MenuCardProps) {
  const cs = getCategoryStyle(item.category)

  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        background: '#161616',
        border: '1px solid #222',
        borderRadius: 9,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#333'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#222'
      }}
    >
      {/* Image area */}
      <div
        style={{
          height: 120,
          background: cs.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{getCategoryStyle(item.category).icon}</span>
        )}
        {item.modifierGroups.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 10,
            fontWeight: 600,
            color: cs.accent,
          }}>
            Customise
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', lineHeight: 1.3 }}>{item.name}</div>
        {item.description && (
          <div style={{ fontSize: 11, color: '#5a5450', lineHeight: 1.5, flex: 1 }}>
            {item.description}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: cs.accent }}>{formatPrice(item.basePrice)}</span>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A017, #C0392B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: '#fff',
            fontWeight: 300,
          }}>
            +
          </div>
        </div>
      </div>
    </div>
  )
}
