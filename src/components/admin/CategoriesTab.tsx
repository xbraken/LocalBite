'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { getCategoryStyle } from '@/lib/categoryStyles'

interface Category {
  id: number
  restaurantId: number
  name: string
  imageUrl: string | null
  sortOrder: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function tenantParam() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('tenant')
}
function apiPath(base: string) {
  const t = tenantParam()
  return t ? `${base}?tenant=${t}` : base
}

export function CategoriesTab() {
  const { data, mutate } = useSWR<{ categories: Category[] }>(apiPath('/api/categories'), fetcher)
  const cats = data?.categories ?? []
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const createCategory = async () => {
    setError('')
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(apiPath('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Failed')
      }
      setNewName('')
      mutate()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const updateCategory = async (id: number, patch: Partial<Category>) => {
    await fetch(apiPath(`/api/categories/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    mutate()
  }

  const deleteCategory = async (cat: Category) => {
    const others = cats.filter((c) => c.id !== cat.id)
    let reassignTo: string | null = null
    const first = await fetch(apiPath(`/api/categories/${cat.id}`), { method: 'DELETE' })
    if (first.status === 409) {
      const body = await first.json()
      if (others.length === 0) {
        alert(`"${cat.name}" has ${body.itemCount} item(s). Create another category first, then delete this one (or delete the items).`)
        return
      }
      const names = others.map((c) => c.name).join(', ')
      reassignTo = prompt(`"${cat.name}" has ${body.itemCount} item(s). Move them to which category?\n\nAvailable: ${names}`, others[0].name)
      if (!reassignTo) return
      const base = apiPath(`/api/categories/${cat.id}`)
      const sep = base.includes('?') ? '&' : '?'
      const retry = await fetch(`${base}${sep}reassignTo=${encodeURIComponent(reassignTo)}`, { method: 'DELETE' })
      if (!retry.ok) {
        const e = await retry.json().catch(() => ({}))
        alert(e.error ?? 'Failed to delete')
        return
      }
    } else if (!first.ok) {
      const e = await first.json().catch(() => ({}))
      alert(e.error ?? 'Failed to delete')
      return
    }
    mutate()
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>Categories</h2>
        <p style={{ fontSize: 12, color: '#3a3430', marginTop: 2 }}>
          Add, rename, reorder, and set the image for each menu category.
        </p>
      </div>

      {/* New category */}
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 14, marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') createCategory() }}
          placeholder="New category name (e.g. Starters, Desserts)"
          style={{ flex: 1, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 7, padding: '9px 11px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={createCategory}
          disabled={creating || !newName.trim()}
          style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #D4A017, #C0392B)', border: 'none', borderRadius: 7, padding: '10px 16px', cursor: creating ? 'default' : 'pointer', fontFamily: 'inherit', opacity: !newName.trim() ? 0.4 : 1 }}
        >
          {creating ? 'Adding…' : '+ Add category'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#C0392B', padding: '9px 12px', background: 'rgba(192,57,43,0.1)', borderRadius: 7 }}>{error}</div>
      )}

      {/* Category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cats.map((cat) => {
          const cs = getCategoryStyle(cat.name)
          return (
            <CategoryRow key={cat.id} category={cat} fallbackGradient={cs.gradient} accent={cs.accent} onUpdate={updateCategory} onDelete={() => deleteCategory(cat)} />
          )
        })}
        {cats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#2a2a2a', fontSize: 12, border: '1px dashed #1a1a1a', borderRadius: 10 }}>
            No categories yet. Add one above to get started.
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryRow({ category, fallbackGradient, accent, onUpdate, onDelete }: {
  category: Category
  fallbackGradient: string
  accent: string
  onUpdate: (id: number, patch: Partial<Category>) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(category.name)
  const [imageUrl, setImageUrl] = useState(category.imageUrl ?? '')
  const [expanded, setExpanded] = useState(false)

  const commitName = () => {
    if (name.trim() && name !== category.name) onUpdate(category.id, { name: name.trim() })
  }
  const commitImage = () => {
    if (imageUrl !== (category.imageUrl ?? '')) onUpdate(category.id, { imageUrl })
  }

  return (
    <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Thumb */}
        <div style={{
          width: 56, height: 56, borderRadius: 8,
          background: imageUrl ? `url(${imageUrl}) center/cover` : fallbackGradient,
          border: `1px solid ${accent}44`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, fontSize: 20,
        }}>
          {!imageUrl && '🍽'}
        </div>

        {/* Name */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{ flex: 1, background: 'transparent', border: 'none', color: '#F0EBE3', fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit', padding: '4px 0' }}
        />

        <button
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: 11, fontWeight: 700, color: '#78726C', background: 'transparent', border: '1px solid #252525', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {expanded ? 'Close' : 'Edit image'}
        </button>
        <button
          onClick={onDelete}
          style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #1a1a1a', background: '#0a0a0a' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a4440', marginBottom: 6 }}>Image URL</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…jpg (Unsplash, your CDN, etc.)"
              style={{ flex: 1, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 7, padding: '9px 11px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={commitImage}
              style={{ fontSize: 12, fontWeight: 700, color: '#D4A017', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Save
            </button>
            {imageUrl && (
              <button
                onClick={() => { setImageUrl(''); onUpdate(category.id, { imageUrl: '' }) }}
                style={{ fontSize: 12, fontWeight: 700, color: '#78726C', background: 'transparent', border: '1px solid #252525', borderRadius: 7, padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ fontSize: 10, color: '#3a3430', marginTop: 6 }}>
            Leave empty to use the default gradient + artwork.
          </div>
        </div>
      )}
    </div>
  )
}
