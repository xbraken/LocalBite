'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Toggle } from '@/components/ui/Toggle'
import { formatPrice } from '@/lib/utils'
import { getCategoryStyle } from '@/lib/categoryStyles'
import type { MenuByCategory, MenuItem } from '@/types/menu'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function MenuBuilder() {
  const { data, mutate } = useSWR<{ menu: MenuByCategory }>('/api/menu', fetcher)
  const menu = data?.menu ?? {}
  const categories = Object.keys(menu)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] ?? '')
  const [expandedItem, setExpandedItem] = useState<number | string | null>(null)

  const toggleAvailability = async (itemId: number | string, current: boolean) => {
    await fetch(`/api/menu/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !current }),
    })
    mutate()
  }

  const currentItems = menu[activeCategory] ?? []

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3', marginBottom: 20 }}>Menu Management</h2>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map((cat) => {
          const cs = getCategoryStyle(cat)
          const isActive = cat === activeCategory
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: 7,
                border: `1.5px solid ${isActive ? cs.accent : '#252525'}`,
                background: isActive ? `${cs.accent}14` : 'transparent',
                color: isActive ? cs.accent : '#5a5450',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{cs.icon}</span> {cat}
              <span style={{ fontSize: 10, opacity: 0.7 }}>({(menu[cat] ?? []).length})</span>
            </button>
          )
        })}
      </div>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentItems.map((item) => (
          <div key={item.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
            {/* Item row */}
            <div
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            >
              {/* Drag handle */}
              <span style={{ color: '#252525', fontSize: 16, cursor: 'grab', userSelect: 'none' }}>⠿</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.isAvailable ? '#F0EBE3' : '#4a4440' }}>{item.name}</div>
                {item.description && (
                  <div style={{ fontSize: 11, color: '#3a3430', marginTop: 2 }}>{item.description}</div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D4A017' }}>{formatPrice(item.basePrice)}</span>
                {item.modifierGroups.length > 0 && (
                  <span style={{ fontSize: 10, color: '#5a5450', background: '#1a1a1a', borderRadius: 4, padding: '2px 6px' }}>
                    {item.modifierGroups.length} modifier{item.modifierGroups.length !== 1 ? 's' : ''}
                  </span>
                )}
                <Toggle
                  on={item.isAvailable}
                  onChange={() => toggleAvailability(item.id, item.isAvailable)}
                />
                <span style={{ color: '#252525', fontSize: 12, transform: expandedItem === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </div>
            </div>

            {/* Expanded modifier groups */}
            {expandedItem === item.id && item.modifierGroups.length > 0 && (
              <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 18px 18px' }}>
                <div style={{ fontSize: 11, color: '#4a4440', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modifier Groups</div>
                {item.modifierGroups.map((group) => (
                  <div key={group.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3' }}>{group.name}</span>
                      <span style={{ fontSize: 10, color: group.type === 'required' ? '#D4A017' : '#5a5450', background: group.type === 'required' ? 'rgba(212,160,23,0.1)' : '#1a1a1a', borderRadius: 4, padding: '2px 6px' }}>
                        {group.type}
                      </span>
                      <span style={{ fontSize: 10, color: '#4a4440' }}>Pick {group.minChoices}–{group.maxChoices}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {group.options.map((opt) => (
                        <span key={opt.id} style={{ fontSize: 11, color: '#9a9490', background: '#161616', borderRadius: 5, padding: '4px 10px', border: '1px solid #222' }}>
                          {opt.name}
                          {opt.priceDelta !== 0 && (
                            <span style={{ color: opt.priceDelta > 0 ? '#D4A017' : '#2ECC71', marginLeft: 4 }}>
                              {opt.priceDelta > 0 ? '+' : ''}{formatPrice(opt.priceDelta)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expandedItem === item.id && item.modifierGroups.length === 0 && (
              <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 18px', fontSize: 11, color: '#2a2a2a' }}>
                No modifier groups — item added directly to basket
              </div>
            )}
          </div>
        ))}
        {currentItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#2a2a2a', fontSize: 12 }}>
            No items in this category
          </div>
        )}
      </div>
    </div>
  )
}
