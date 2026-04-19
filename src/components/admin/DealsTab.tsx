'use client'

import { useState } from 'react'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Deal {
  id: number
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  minOrder: number
  expiresAt: string | null
  isActive: boolean
}

export function DealsTab() {
  const [deals, setDeals] = useState<Deal[]>([
    { id: 1, code: 'WELCOME10', discountType: 'percent', discountValue: 10, minOrder: 0, expiresAt: null, isActive: true },
    { id: 2, code: 'SAVE5', discountType: 'fixed', discountValue: 5, minOrder: 20, expiresAt: null, isActive: false },
  ])
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrder, setMinOrder] = useState('')

  const toggleDeal = (id: number) => {
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, isActive: !d.isActive } : d))
  }

  const addDeal = () => {
    if (!code || !discountValue) return
    const newDeal: Deal = {
      id: Date.now(),
      code: code.toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      minOrder: parseFloat(minOrder) || 0,
      expiresAt: null,
      isActive: true,
    }
    setDeals((prev) => [...prev, newDeal])
    setCode(''); setDiscountValue(''); setMinOrder(''); setShowForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>Deals & Discounts</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>+ New Deal</Button>
      </div>

      {showForm && (
        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', marginBottom: 4 }}>New Deal</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SAVE10" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (£)</option>
              </select>
            </div>
            <Input label="Value" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '10' : '5.00'} type="number" />
            <Input label="Min Order (£)" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" type="number" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button size="sm" onClick={addDeal}>Create Deal</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deals.map((deal) => (
          <div key={deal.id} style={{
            background: '#0f0f0f',
            border: '1px solid #1a1a1a',
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: deal.isActive ? 1 : 0.5,
          }}>
            <code style={{ fontSize: 14, fontWeight: 800, color: '#D4A017', background: 'rgba(212,160,23,0.1)', padding: '4px 10px', borderRadius: 6, letterSpacing: '0.05em' }}>{deal.code}</code>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: '#C8C4BC' }}>
                {deal.discountType === 'percent' ? `${deal.discountValue}% off` : `£${deal.discountValue.toFixed(2)} off`}
                {deal.minOrder > 0 && ` · min £${deal.minOrder.toFixed(2)}`}
              </span>
            </div>
            <Toggle on={deal.isActive} onChange={() => toggleDeal(deal.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}
