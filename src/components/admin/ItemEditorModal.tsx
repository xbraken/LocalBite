'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { formatPrice } from '@/lib/utils'
import type { MenuItem } from '@/types/menu'

type Preset = 'simple' | 'options' | 'meal'

interface DraftOption { name: string; priceDelta: number }
interface DraftGroup {
  name: string
  type: 'required' | 'optional'
  minChoices: number
  maxChoices: number
  options: DraftOption[]
}
interface Draft {
  name: string
  description: string
  basePrice: number
  category: string
  imageUrl: string
  groups: DraftGroup[]
}

interface ItemEditorModalProps {
  item: MenuItem | null // null = new item
  categories: string[]  // existing categories for autocomplete
  onClose: () => void
  onSaved: () => void
}

function detectPreset(draft: Draft): Preset {
  if (draft.groups.length === 0) return 'simple'
  const allRequired = draft.groups.every((g) => g.type === 'required' && g.minChoices >= 1 && g.maxChoices === 1)
  const allFreeOptions = draft.groups.every((g) => g.options.every((o) => o.priceDelta === 0))
  if (draft.groups.length >= 2 && allRequired && allFreeOptions) return 'meal'
  return 'options'
}

function applyPreset(preset: Preset, current: Draft): Draft {
  if (preset === 'simple') return { ...current, groups: [] }
  if (preset === 'options' && current.groups.length === 0) {
    return {
      ...current,
      groups: [{
        name: 'Size',
        type: 'required',
        minChoices: 1,
        maxChoices: 1,
        options: [
          { name: 'Small', priceDelta: 0 },
          { name: 'Medium', priceDelta: 1 },
          { name: 'Large', priceDelta: 2 },
        ],
      }],
    }
  }
  if (preset === 'meal' && current.groups.length === 0) {
    return {
      ...current,
      groups: [
        { name: 'Starter', type: 'required', minChoices: 1, maxChoices: 1, options: [{ name: 'Spring Rolls', priceDelta: 0 }] },
        { name: 'Main', type: 'required', minChoices: 1, maxChoices: 1, options: [{ name: 'Sweet & Sour Chicken', priceDelta: 0 }] },
        { name: 'Rice', type: 'required', minChoices: 1, maxChoices: 1, options: [{ name: 'Egg Fried Rice', priceDelta: 0 }] },
        { name: 'Drink', type: 'required', minChoices: 1, maxChoices: 1, options: [{ name: 'Can of Coke', priceDelta: 0 }] },
      ],
    }
  }
  return current
}

export function ItemEditorModal({ item, categories, onClose, onSaved }: ItemEditorModalProps) {
  const [draft, setDraft] = useState<Draft>(() => ({
    name: item?.name ?? '',
    description: item?.description ?? '',
    basePrice: item?.basePrice ?? 0,
    category: item?.category ?? (categories[0] ?? ''),
    imageUrl: item?.imageUrl ?? '',
    groups: (item?.modifierGroups ?? []).map((g) => ({
      name: g.name,
      type: g.type,
      minChoices: g.minChoices,
      maxChoices: g.maxChoices,
      options: g.options.map((o) => ({ name: o.name, priceDelta: o.priceDelta })),
    })),
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const preset = detectPreset(draft)

  const setPreset = (p: Preset) => {
    if (preset === p) return
    if (draft.groups.length > 0 && p === 'simple') {
      if (!confirm('This will remove all options/modifiers. Continue?')) return
    }
    if (draft.groups.length > 0 && p !== preset && draft.groups.some((g) => g.options.some((o) => o.name.trim()))) {
      if (!confirm('Switching preset will replace your current options with a template. Continue?')) return
    }
    setDraft((d) => applyPreset(p, { ...d, groups: [] }))
  }

  const updateGroup = (gi: number, patch: Partial<DraftGroup>) => {
    setDraft((d) => ({ ...d, groups: d.groups.map((g, i) => i === gi ? { ...g, ...patch } : g) }))
  }
  const addGroup = () => {
    setDraft((d) => ({
      ...d,
      groups: [...d.groups, { name: '', type: 'optional', minChoices: 0, maxChoices: 1, options: [{ name: '', priceDelta: 0 }] }],
    }))
  }
  const removeGroup = (gi: number) => {
    setDraft((d) => ({ ...d, groups: d.groups.filter((_, i) => i !== gi) }))
  }
  const updateOption = (gi: number, oi: number, patch: Partial<DraftOption>) => {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => i !== gi ? g : { ...g, options: g.options.map((o, j) => j === oi ? { ...o, ...patch } : o) }),
    }))
  }
  const addOption = (gi: number) => {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => i !== gi ? g : { ...g, options: [...g.options, { name: '', priceDelta: 0 }] }),
    }))
  }
  const removeOption = (gi: number, oi: number) => {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => i !== gi ? g : { ...g, options: g.options.filter((_, j) => j !== oi) }),
    }))
  }

  const tenantParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
  const apiPath = (base: string) => tenantParam ? `${base}?tenant=${tenantParam}` : base

  const save = async () => {
    setError('')
    if (!draft.name.trim()) return setError('Name is required')
    if (!draft.category.trim()) return setError('Category is required')
    if (draft.basePrice < 0) return setError('Price must be ≥ 0')

    // Validate groups
    const cleanedGroups: DraftGroup[] = []
    for (const g of draft.groups) {
      if (!g.name.trim()) return setError('Every option group needs a name')
      const opts = g.options.filter((o) => o.name.trim())
      if (opts.length === 0) return setError(`"${g.name}" needs at least one choice`)
      cleanedGroups.push({ ...g, options: opts })
    }

    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        basePrice: Number(draft.basePrice),
        category: draft.category.trim(),
        imageUrl: draft.imageUrl.trim(),
        groups: cleanedGroups,
      }
      const url = item ? apiPath(`/api/menu/${item.id}`) : apiPath('/api/menu')
      const method = item ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Save failed')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!item) return
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return
    setSaving(true)
    try {
      const res = await fetch(apiPath(`/api/menu/${item.id}`), { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const groupLabel = preset === 'meal' ? 'Course' : 'Option group'
  const optionLabel = preset === 'meal' ? 'Dish choice' : 'Choice'

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#F0EBE3' }}>{item ? 'Edit item' : 'New item'}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a4440', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '18px 24px' }}>
        {/* Preset chooser */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a4440', marginBottom: 10 }}>What kind of item?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {([
              { key: 'simple', title: 'Simple item', hint: 'Fixed name and price — just tap to add' },
              { key: 'options', title: 'With options', hint: 'Customer picks size, spice level, etc.' },
              { key: 'meal', title: 'Meal deal', hint: 'Customer picks one from each course' },
            ] as const).map((p) => {
              const active = preset === p.key
              return (
                <button key={p.key} onClick={() => setPreset(p.key)} type="button" style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${active ? '#D4A017' : '#1e1e1e'}`,
                  background: active ? 'rgba(212,160,23,0.08)' : '#111',
                  transition: 'all 0.12s',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#D4A017' : '#F0EBE3' }}>{p.title}</div>
                  <div style={{ fontSize: 10, color: '#5a5450', marginTop: 4, lineHeight: 1.4 }}>{p.hint}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Image */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 96, height: 96, borderRadius: 10, border: '1px solid #1e1e1e', background: '#0e0e0e', backgroundImage: draft.imageUrl ? `url(${draft.imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#3a3430', flexShrink: 0 }}>
            {!draft.imageUrl && '📷'}
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Image URL (optional)">
              <input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://…jpg" style={inputStyle} />
            </Field>
            <div style={{ fontSize: 10, color: '#3a3430', marginTop: -4 }}>
              Paste a URL to any image (Unsplash, your own CDN, etc.) — preview updates live.
            </div>
          </div>
        </div>

        {/* Basic fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10 }}>
          <Field label="Name">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Sweet & Sour Chicken" style={inputStyle} />
          </Field>
          <Field label={preset === 'meal' ? 'Meal price' : 'Price'}>
            <input type="number" step="0.01" value={draft.basePrice} onChange={(e) => setDraft({ ...draft, basePrice: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </Field>
        </div>

        <Field label="Description (optional)">
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Short description shown to customers" style={inputStyle} />
        </Field>

        <Field label="Category">
          <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} list="categories" placeholder="e.g. Mains, Starters, Drinks" style={inputStyle} />
          <datalist id="categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>

        {/* Groups section */}
        {preset !== 'simple' && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a4440' }}>
                {preset === 'meal' ? 'Courses' : 'Option groups'}
              </div>
              <button type="button" onClick={addGroup} style={addBtnStyle}>
                + Add {groupLabel.toLowerCase()}
              </button>
            </div>

            {draft.groups.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#3a3430', fontSize: 12, border: '1px dashed #1e1e1e', borderRadius: 8 }}>
                No {groupLabel.toLowerCase()}s yet
              </div>
            )}

            {draft.groups.map((group, gi) => (
              <div key={gi} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 9, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    value={group.name}
                    onChange={(e) => updateGroup(gi, { name: e.target.value })}
                    placeholder={preset === 'meal' ? 'e.g. Starter, Main, Drink' : 'e.g. Size, Spice Level'}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {preset !== 'meal' && (
                    <select value={group.type} onChange={(e) => updateGroup(gi, { type: e.target.value as 'required' | 'optional' })} style={selectStyle}>
                      <option value="optional">Optional</option>
                      <option value="required">Required</option>
                    </select>
                  )}
                  <button type="button" onClick={() => removeGroup(gi)} style={removeBtnStyle}>✕</button>
                </div>

                {preset === 'options' && group.maxChoices > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 11, color: '#5a5450' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Min pick:
                      <input type="number" min={0} value={group.minChoices} onChange={(e) => updateGroup(gi, { minChoices: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: 50, padding: '5px 7px' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Max pick:
                      <input type="number" min={1} value={group.maxChoices} onChange={(e) => updateGroup(gi, { maxChoices: parseInt(e.target.value) || 1 })} style={{ ...inputStyle, width: 50, padding: '5px 7px' }} />
                    </label>
                  </div>
                )}

                {preset === 'options' && (
                  <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 11, color: '#78726C' }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={group.maxChoices > 1} onChange={(e) => updateGroup(gi, { maxChoices: e.target.checked ? 5 : 1, minChoices: e.target.checked ? 0 : group.minChoices })} />
                      Allow multiple choices
                    </label>
                  </div>
                )}

                {/* Options list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.options.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={opt.name}
                        onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                        placeholder={preset === 'meal' ? 'Dish name' : 'Choice name'}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {preset !== 'meal' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0e0e0e', border: '1px solid #1e1e1e', borderRadius: 6, padding: '0 8px' }}>
                          <span style={{ fontSize: 11, color: '#4a4440' }}>+£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={opt.priceDelta}
                            onChange={(e) => updateOption(gi, oi, { priceDelta: parseFloat(e.target.value) || 0 })}
                            style={{ width: 60, background: 'transparent', border: 'none', color: '#F0EBE3', fontSize: 12, outline: 'none', padding: '7px 0', fontFamily: 'inherit' }}
                          />
                        </div>
                      )}
                      <button type="button" onClick={() => removeOption(gi, oi)} style={removeBtnStyle}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(gi)} style={{ ...addBtnStyle, alignSelf: 'flex-start', marginTop: 2 }}>
                    + Add {optionLabel.toLowerCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, fontSize: 12, color: '#C0392B', padding: '9px 12px', background: 'rgba(192,57,43,0.1)', borderRadius: 7 }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        {item && (
          <button type="button" onClick={del} disabled={saving} style={{ fontSize: 12, fontWeight: 700, color: '#C0392B', background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 7, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Delete
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onClose} disabled={saving} style={{ fontSize: 12, fontWeight: 700, color: '#78726C', background: 'transparent', border: '1px solid #252525', borderRadius: 7, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #D4A017, #C0392B)', border: 'none', borderRadius: 7, padding: '11px 22px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : item ? 'Save changes' : `Create item · ${formatPrice(draft.basePrice)}`}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a4440', marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0e0e0e',
  border: '1px solid #1e1e1e',
  borderRadius: 7,
  padding: '9px 11px',
  color: '#F0EBE3',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  background: '#0e0e0e',
  border: '1px solid #1e1e1e',
  borderRadius: 7,
  padding: '9px 10px',
  color: '#F0EBE3',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const addBtnStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#D4A017',
  background: 'rgba(212,160,23,0.08)',
  border: '1px solid rgba(212,160,23,0.2)',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const removeBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid #1e1e1e',
  background: '#0e0e0e',
  color: '#5a5450',
  cursor: 'pointer',
  fontSize: 12,
  flexShrink: 0,
  fontFamily: 'inherit',
}
