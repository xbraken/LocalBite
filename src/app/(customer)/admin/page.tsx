'use client'

import { useState } from 'react'
import { AdminOverview } from '@/components/admin/OverviewTab'
import { AdminOrders } from '@/components/admin/OrdersTab'
import { MenuBuilder } from '@/components/admin/MenuBuilder'
import { OpeningHoursTab } from '@/components/admin/OpeningHoursTab'
import { DealsTab } from '@/components/admin/DealsTab'
import { SettingsTab } from '@/components/admin/SettingsTab'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'menu', label: 'Menu Management' },
  { id: 'hours', label: 'Opening Hours' },
  { id: 'deals', label: 'Deals & Discounts' },
  { id: 'settings', label: 'Settings' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0C0C0C', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav style={{
        width: 200,
        background: '#0f0f0f',
        borderRight: '1px solid #1a1a1a',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid #1a1a1a', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EBE3' }}>Admin Panel</div>
          <div style={{ fontSize: 10, color: '#3a3430', marginTop: 2 }}>Restaurant Dashboard</div>
        </div>

        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${activeTab === tab.id ? '#D4A017' : 'transparent'}`,
              color: activeTab === tab.id ? '#D4A017' : '#5a5450',
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'all 0.1s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'menu' && <MenuBuilder />}
        {activeTab === 'hours' && <OpeningHoursTab />}
        {activeTab === 'deals' && <DealsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  )
}
