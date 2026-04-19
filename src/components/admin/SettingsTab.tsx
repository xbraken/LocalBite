'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SettingsTab() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3', marginBottom: 20 }}>Settings</h2>

      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 24, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', marginBottom: 4 }}>Restaurant Details</div>
        <Input label="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Golden Panda" />
        <Input label="Contact email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@restaurant.com" type="email" />
        <Input label="Contact phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44..." type="tel" />

        <Button onClick={save} className="mt-2">
          {saved ? '✓ Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
