'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Toggle } from '@/components/ui/Toggle'
import { formatPrice } from '@/lib/utils'
import { getCategoryStyle } from '@/lib/categoryStyles'
import { ItemEditorModal } from './ItemEditorModal'
import { AiMenuImportModal } from './AiMenuImportModal'
import type { MenuByCategory, MenuItem } from '@/types/menu'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function menuUrl() {
  if (typeof window === 'undefined') return '/api/menu'
  const tenant = new URLSearchParams(window.location.search).get('tenant')
  return tenant ? `/api/menu?tenant=${tenant}` : '/api/menu'
}

export function MenuBuilder() {
  const { data, mutate } = useSWR<{ menu: MenuByCategory }>(menuUrl(), fetcher)
  const menu = data?.menu ?? {}
  const categories = Object.keys(menu)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [aiImport, setAiImport] = useState(false)

  const tenantParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
  const apiPath = (base: string) => tenantParam ? `${base}?tenant=${tenantParam}` : base

  const toggleAvailability = async (itemId: number | string, current: boolean) => {
    await fetch(apiPath(`/api/menu/${itemId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !current }),
    })
    mutate()
  }

  const allItems = categories.flatMap((c) => menu[c] ?? [])
  const currentItems = activeCategory === 'All' ? allItems : (menu[activeCategory] ?? [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>Menu Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAiImport(true)}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#D4A017',
              background: 'rgba(212,160,23,0.08)',
              border: '1px solid rgba(212,160,23,0.35)',
              borderRadius: 7,
              padding: '10px 14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✨ AI import
          </button>
          <button
            onClick={() => setCreatingNew(true)}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #D4A017, #C0392B)',
              border: 'none',
              borderRadius: 7,
              padding: '10px 16px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + New item
          </button>
        </div>
      </div>

      {aiImport && (
        <AiMenuImportModal onClose={() => setAiImport(false)} onImported={() => mutate()} />
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory('All')}
          style={{
            padding: '8px 16px',
            borderRadius: 7,
            border: `1.5px solid ${activeCategory === 'All' ? '#D4A017' : '#252525'}`,
            background: activeCategory === 'All' ? 'rgba(212,160,23,0.08)' : 'transparent',
            color: activeCategory === 'All' ? '#D4A017' : '#5a5450',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          All <span style={{ fontSize: 10, opacity: 0.7 }}>({allItems.length})</span>
        </button>
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
              {cat}
              <span style={{ fontSize: 10, opacity: 0.7 }}>({(menu[cat] ?? []).length})</span>
            </button>
          )
        })}
      </div>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentItems.map((item) => (
          <div key={item.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => setEditing(item)}
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            >
              {/* Thumbnail */}
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1a1a1a', backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#3a3430' }}>
                {!item.imageUrl && '🍽'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.isAvailable ? '#F0EBE3' : '#4a4440' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#3a3430', marginTop: 2, display: 'flex', gap: 8 }}>
                  <span>{item.category}</span>
                  {item.modifierGroups.length > 0 && (
                    <>
                      <span>·</span>
                      <span>{item.modifierGroups.length} option group{item.modifierGroups.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D4A017' }}>{formatPrice(item.basePrice)}</span>
                <Toggle on={item.isAvailable} onChange={() => toggleAvailability(item.id, item.isAvailable)} />
                <span style={{ color: '#252525', fontSize: 12 }}>›</span>
              </div>
            </div>
          </div>
        ))}
        {currentItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#2a2a2a', fontSize: 12, border: '1px dashed #1a1a1a', borderRadius: 10 }}>
            No items yet. Click "+ New item" to get started.
          </div>
        )}
      </div>

      {(editing || creatingNew) && (
        <ItemEditorModal
          item={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreatingNew(false) }}
          onSaved={() => mutate()}
        />
      )}
    </div>
  )
}
