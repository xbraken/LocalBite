'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Toggle } from '@/components/ui/Toggle'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { PlanBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatPrice } from '@/lib/utils'

interface Restaurant {
  id: number
  name: string
  subdomain: string
  planType: string
  commissionRate: number
  monthlyFee: number
  isActive: number
  stripeAccountId: string | null
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function SuperAdminPage() {
  const { data, mutate } = useSWR<{ restaurants: Restaurant[] }>('/api/restaurants', fetcher)
  const restaurants = data?.restaurants ?? []
  const [showNewModal, setShowNewModal] = useState(false)

  // New restaurant form
  const [newName, setNewName] = useState('')
  const [newSubdomain, setNewSubdomain] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPlan, setNewPlan] = useState('starter')
  const [newCommission, setNewCommission] = useState('8.5')
  const [newFee, setNewFee] = useState('49')
  const [newTemplate, setNewTemplate] = useState('custom')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const updateRestaurant = async (id: number, updates: Record<string, unknown>) => {
    await fetch('/api/restaurants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    mutate()
  }

  const createRestaurant = async () => {
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          subdomain: newSubdomain,
          ownerEmail: newEmail,
          planType: newPlan,
          commissionRate: parseFloat(newCommission),
          monthlyFee: parseFloat(newFee),
          menuTemplate: newTemplate,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setCreateError(err.error ?? 'Failed to create')
        return
      }
      mutate()
      setShowNewModal(false)
      setNewName(''); setNewSubdomain(''); setNewEmail('')
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const activeCount = restaurants.filter((r) => r.isActive).length
  const totalMRR = restaurants.filter((r) => r.isActive).reduce((s, r) => s + r.monthlyFee, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #D4A017, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#F0EBE3' }}>TakeawayOS</span>
            <span style={{ fontSize: 10, color: '#5a5450', background: '#1a1a1a', padding: '2px 8px', borderRadius: 20 }}>Super Admin</span>
          </div>
          <p style={{ fontSize: 12, color: '#4a4440' }}>Platform management console</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ New Restaurant</Button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Restaurants', value: restaurants.length, color: '#F0EBE3' },
          { label: 'Active', value: activeCount, color: '#2ECC71' },
          { label: 'Platform MRR', value: formatPrice(totalMRR), color: '#D4A017' },
          { label: 'Inactive', value: restaurants.length - activeCount, color: '#78726C' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: '#78726C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Restaurant table */}
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>Restaurants</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              {['Restaurant', 'Subdomain', 'Plan', 'Commission', 'Monthly Fee', 'Stripe', 'Active', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#4a4440', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>{r.name}</td>
                <td style={{ padding: '14px 20px' }}>
                  <code style={{ fontSize: 11, color: '#78726C', background: '#1a1a1a', padding: '3px 8px', borderRadius: 4 }}>{r.subdomain}</code>
                </td>
                <td style={{ padding: '14px 20px' }}><PlanBadge plan={r.planType} /></td>
                <td style={{ padding: '14px 20px' }}>
                  <InlineEdit
                    value={r.commissionRate}
                    suffix="%"
                    type="number"
                    onSave={(v) => updateRestaurant(r.id, { commissionRate: parseFloat(v) })}
                  />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <InlineEdit
                    value={r.monthlyFee}
                    prefix="£"
                    type="number"
                    onSave={(v) => updateRestaurant(r.id, { monthlyFee: parseFloat(v) })}
                  />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {r.stripeAccountId ? (
                    <span style={{ fontSize: 11, color: '#2ECC71' }}>✓ Connected</span>
                  ) : (
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/stripe/connect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ restaurantId: r.id }),
                        })
                        const { url } = await res.json()
                        if (url) window.open(url, '_blank')
                      }}
                      style={{ fontSize: 11, color: '#D4A017', background: 'none', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Onboard
                    </button>
                  )}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Toggle
                    on={Boolean(r.isActive)}
                    onChange={(v) => updateRestaurant(r.id, { isActive: v })}
                  />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <a
                    href={`http://${r.subdomain}.localhost:3000`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: '#5a5450', textDecoration: 'none' }}
                  >
                    Visit →
                  </a>
                </td>
              </tr>
            ))}
            {restaurants.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#2a2a2a', fontSize: 12 }}>No restaurants yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New restaurant modal */}
      {showNewModal && (
        <Modal onClose={() => setShowNewModal(false)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#F0EBE3' }}>New Restaurant</div>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
            <Input label="Restaurant Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Golden Panda" />
            <Input label="Subdomain" value={newSubdomain} onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="goldenpanda" />
            <Input label="Owner Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="owner@restaurant.com" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Plan</label>
                <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>Menu Template</label>
                <select value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, padding: '10px 12px', color: '#F0EBE3', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                  <option value="chinese">Chinese</option>
                  <option value="pizza">Pizza</option>
                  <option value="burger">Burger</option>
                  <option value="indian">Indian</option>
                  <option value="custom">Custom (blank)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Commission Rate (%)" value={newCommission} onChange={(e) => setNewCommission(e.target.value)} type="number" placeholder="8.5" />
              <Input label="Monthly Fee (£)" value={newFee} onChange={(e) => setNewFee(e.target.value)} type="number" placeholder="49" />
            </div>
            {createError && <div style={{ fontSize: 12, color: '#C0392B', padding: '8px 12px', background: 'rgba(192,57,43,0.1)', borderRadius: 6 }}>{createError}</div>}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: 10 }}>
            <Button onClick={createRestaurant} disabled={creating}>
              {creating ? 'Creating...' : 'Create Restaurant'}
            </Button>
            <Button variant="ghost" onClick={() => setShowNewModal(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
