'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { getCategoryStyle } from '@/lib/categoryStyles'
import { formatPrice } from '@/lib/utils'
import type { MenuItem, ModifierGroup } from '@/types/menu'
import type { BasketItem, SelectedModifier } from '@/types/order'

interface ItemCustomiserModalProps {
  item: MenuItem
  onAdd: (item: BasketItem) => void
  onClose: () => void
}

export function ItemCustomiserModal({ item, onAdd, onClose }: ItemCustomiserModalProps) {
  const cs = getCategoryStyle(item.category)
  const groups = item.modifierGroups ?? []

  const [selections, setSelections] = useState<Record<string, Set<number | string>>>(() => {
    const s: Record<string, Set<number | string>> = {}
    groups.forEach((g) => { s[String(g.id)] = new Set() })
    return s
  })

  const toggleOption = (group: ModifierGroup, optId: number | string) => {
    setSelections((prev) => {
      const key = String(group.id)
      const cur = new Set(prev[key])
      if (group.maxChoices === 1) {
        return { ...prev, [key]: new Set([optId]) }
      }
      if (cur.has(optId)) {
        cur.delete(optId)
      } else if (cur.size < group.maxChoices) {
        cur.add(optId)
      }
      return { ...prev, [key]: cur }
    })
  }

  const isValid = groups.every((g) => {
    if (g.type === 'required') return (selections[String(g.id)]?.size ?? 0) >= g.minChoices
    return true
  })

  const extraCost = groups.reduce((sum, g) => {
    const sel = selections[String(g.id)] ?? new Set()
    return sum + g.options
      .filter((o) => sel.has(o.id))
      .reduce((s, o) => s + o.priceDelta, 0)
  }, 0)

  const totalPrice = item.basePrice + extraCost

  const handleAdd = () => {
    const selectedModifiers: SelectedModifier[] = []
    const labelParts: string[] = []

    groups.forEach((g) => {
      const sel = selections[String(g.id)] ?? new Set()
      g.options
        .filter((o) => sel.has(o.id))
        .forEach((o) => {
          selectedModifiers.push({
            groupId: g.id,
            groupName: g.name,
            optionId: o.id,
            optionName: o.name,
            priceDelta: o.priceDelta,
          })
          labelParts.push(o.name)
        })
    })

    onAdd({
      basketId: `${item.id}_${Date.now()}`,
      itemId: item.id,
      name: item.name,
      basePrice: item.basePrice,
      selectedModifiers,
      totalPrice,
      qty: 1,
      customisationLabel: labelParts.join(' · '),
    })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 14, alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#F0EBE3', lineHeight: 1.2 }}>{item.name}</div>
          {item.description && (
            <div style={{ fontSize: 12, color: '#4a4440', marginTop: 4, lineHeight: 1.5 }}>{item.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a4440', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 0 4px' }}>×</button>
          <span style={{ fontSize: 15, fontWeight: 800, color: cs.accent }}>{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Modifier groups */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
        {groups.map((group) => {
          const key = String(group.id)
          const sel = selections[key] ?? new Set()
          const isComplete = group.type === 'required' ? sel.size >= group.minChoices : true
          const chosenCount = sel.size

          return (
            <div key={group.id} style={{ borderBottom: '1px solid #161616' }}>
              {/* Group header */}
              <div style={{ padding: '14px 24px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>{group.name}</span>
                  <span style={{
                    marginLeft: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: group.type === 'required' ? cs.accent : '#5a5450',
                    background: group.type === 'required' ? `${cs.accent}18` : '#1a1a1a',
                    border: `1px solid ${group.type === 'required' ? cs.accent + '44' : '#252525'}`,
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}>
                    {group.type === 'required' ? 'Required' : 'Optional'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: isComplete ? '#2ECC71' : '#4a4440' }}>
                  {group.maxChoices === 1
                    ? (isComplete ? '✓ Selected' : 'Pick 1')
                    : `${chosenCount}/${group.maxChoices} · Pick up to ${group.maxChoices}`}
                </div>
              </div>

              {/* Options */}
              <div style={{ padding: '0 24px 14px', display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {group.options.map((opt) => {
                  const isChosen = sel.has(opt.id)
                  const isDisabled = !isChosen && group.maxChoices > 1 && chosenCount >= group.maxChoices

                  return (
                    <button
                      key={opt.id}
                      onClick={() => !isDisabled && toggleOption(group, opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 14px',
                        borderRadius: 9,
                        border: `1.5px solid ${isChosen ? cs.accent : '#1e1e1e'}`,
                        background: isChosen ? `${cs.accent}14` : '#0e0e0e',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.4 : 1,
                        transition: 'all 0.12s',
                        textAlign: 'left' as const,
                      }}
                    >
                      {/* Radio/checkbox indicator */}
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: group.maxChoices === 1 ? '50%' : 5,
                        border: `2px solid ${isChosen ? cs.accent : '#333'}`,
                        background: isChosen ? cs.accent : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.12s',
                      }}>
                        {isChosen && <div style={{ width: 6, height: 6, borderRadius: group.maxChoices === 1 ? '50%' : 2, background: '#0C0C0C' }} />}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: isChosen ? '#F0EBE3' : '#9a9490', fontWeight: isChosen ? 600 : 400 }}>
                        {opt.name}
                      </span>
                      {opt.priceDelta !== 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: isChosen ? cs.accent : '#5a5450', flexShrink: 0 }}>
                          {opt.priceDelta > 0 ? `+${formatPrice(opt.priceDelta)}` : `-${formatPrice(Math.abs(opt.priceDelta))}`}
                        </span>
                      )}
                      {opt.priceDelta === 0 && (
                        <span style={{ fontSize: 11, color: '#3a3430', flexShrink: 0 }}>included</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', flexShrink: 0 }}>
        {!isValid && (
          <div style={{ fontSize: 12, color: '#78726C', marginBottom: 10, textAlign: 'center' as const }}>
            Please complete all required selections
          </div>
        )}
        <button
          onClick={isValid ? handleAdd : undefined}
          disabled={!isValid}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: 10,
            border: 'none',
            background: isValid ? 'linear-gradient(135deg, #D4A017, #C0392B)' : '#252525',
            color: isValid ? '#fff' : '#4a4440',
            fontSize: 14,
            fontWeight: 800,
            cursor: isValid ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          Add to order · {formatPrice(totalPrice)}
        </button>
      </div>
    </Modal>
  )
}
