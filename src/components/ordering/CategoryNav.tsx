'use client'

import { getCategoryStyle } from '@/lib/categoryStyles'

interface CategoryNavProps {
  categories: string[]
  active: string
  onSelect: (cat: string) => void
  itemCounts: Record<string, number>
}

export function CategoryNav({ categories, active, onSelect, itemCounts }: CategoryNavProps) {
  return (
    <nav
      style={{
        width: 175,
        background: '#0f0f0f',
        borderRight: '1px solid #1a1a1a',
        flexShrink: 0,
        overflowY: 'auto',
        paddingTop: 8,
      }}
    >
      {categories.map((cat) => {
        const cs = getCategoryStyle(cat)
        const isActive = cat === active
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              background: isActive ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${isActive ? cs.accent : 'transparent'}`,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.1s',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{cs.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? cs.accent : '#78726C',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {cat}
              </div>
              {itemCounts[cat] !== undefined && (
                <div style={{ fontSize: 10, color: '#3a3430', marginTop: 1 }}>
                  {itemCounts[cat]} items
                </div>
              )}
            </div>
          </button>
        )
      })}
    </nav>
  )
}
