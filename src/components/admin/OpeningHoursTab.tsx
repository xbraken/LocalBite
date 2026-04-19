'use client'

import { useState } from 'react'
import { Toggle } from '@/components/ui/Toggle'

const DEFAULT_HOURS = [
  { day: 'Monday', open: '12:00', close: '22:00', on: true },
  { day: 'Tuesday', open: '12:00', close: '22:00', on: true },
  { day: 'Wednesday', open: '12:00', close: '22:30', on: true },
  { day: 'Thursday', open: '12:00', close: '22:30', on: true },
  { day: 'Friday', open: '12:00', close: '23:00', on: true },
  { day: 'Saturday', open: '11:30', close: '23:00', on: true },
  { day: 'Sunday', open: '12:00', close: '21:30', on: true },
]

export function OpeningHoursTab() {
  const [hours, setHours] = useState(DEFAULT_HOURS)

  const update = (index: number, field: string, value: string | boolean) => {
    setHours((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h))
  }

  const timeInput = {
    background: '#1a1a1a',
    border: '1px solid #252525',
    borderRadius: 6,
    padding: '7px 10px',
    color: '#F0EBE3',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
    width: 80,
  } as React.CSSProperties

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3', marginBottom: 20 }}>Opening Hours</h2>
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, overflow: 'hidden' }}>
        {hours.map((row, i) => (
          <div
            key={row.day}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '14px 20px',
              borderBottom: i < hours.length - 1 ? '1px solid #111' : 'none',
              opacity: row.on ? 1 : 0.4,
            }}
          >
            <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: '#F0EBE3' }}>{row.day}</div>
            <Toggle on={row.on} onChange={(v) => update(i, 'on', v)} />
            {row.on ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="time" value={row.open} onChange={(e) => update(i, 'open', e.target.value)} style={timeInput} />
                <span style={{ fontSize: 11, color: '#3a3430' }}>to</span>
                <input type="time" value={row.close} onChange={(e) => update(i, 'close', e.target.value)} style={timeInput} />
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#3a3430' }}>Closed</span>
            )}
          </div>
        ))}
      </div>
      <button
        style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #D4A017, #C0392B)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Save Hours
      </button>
    </div>
  )
}
