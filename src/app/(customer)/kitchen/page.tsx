'use client'

import { useEffect, useRef, useState } from 'react'
import { KanbanBoard } from '@/components/kitchen/KanbanBoard'
import type { Order } from '@/types/order'

let sharedCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedCtx) return sharedCtx
  const Ctx: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  sharedCtx = new Ctx()
  return sharedCtx
}

function playChime() {
  const ctx = getAudioCtx()
  if (!ctx) return
  // If context was created without gesture it can be suspended — resume is ignored off-gesture but harmless
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  const now = ctx.currentTime
  const notes = [880, 1175] // A5, D6 — two-tone chime
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = now + i * 0.18
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.6)
  })
}

function unlockAudio() {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  // Play an inaudible blip during the gesture to fully unlock on Safari/iOS
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  gain.gain.value = 0.0001
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.01)
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [connected, setConnected] = useState(false)
  const [time, setTime] = useState('')
  const [soundOn, setSoundOn] = useState(true)
  const [notifyOn, setNotifyOn] = useState(false)
  const seenIdsRef = useRef<Set<number> | null>(null)
  const soundOnRef = useRef(true)
  const notifyOnRef = useRef(false)

  useEffect(() => { soundOnRef.current = soundOn }, [soundOn])
  useEffect(() => { notifyOnRef.current = notifyOn }, [notifyOn])

  // Unlock audio on the first user interaction anywhere on the page (required by Chrome/Safari)
  useEffect(() => {
    const handler = () => {
      unlockAudio()
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('pointerdown', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

  const enableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifyOn(false)
      return
    }
    if (Notification.permission === 'granted') {
      setNotifyOn(true)
      return
    }
    const result = await Notification.requestPermission()
    setNotifyOn(result === 'granted')
  }

  useEffect(() => {
    // Live clock
    const clockTick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    clockTick()
    const clockId = setInterval(clockTick, 1000)
    return () => clearInterval(clockId)
  }, [])

  const tenantParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
  const apiPath = (base: string) => tenantParam ? `${base}${base.includes('?') ? '&' : '?'}tenant=${tenantParam}` : base

  useEffect(() => {
    const ordersUrl = apiPath('/api/orders')

    const loadOrders = () => {
      fetch(ordersUrl)
        .then((r) => r.json())
        .then(({ orders: rows }) => {
          if (!Array.isArray(rows)) return
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const filtered = rows.filter((o: Order) => {
            if (o.status === 'cancelled') return false
            if (o.status === 'complete') {
              const ts = new Date(String(o.createdAt).replace(' ', 'T') + 'Z')
              return ts >= todayStart
            }
            return true
          })

          const newIds = filtered.filter((o: Order) => o.status === 'new').map((o: Order) => o.id)
          if (seenIdsRef.current === null) {
            seenIdsRef.current = new Set(newIds)
          } else {
            const fresh = newIds.filter((id: number) => !seenIdsRef.current!.has(id))
            if (fresh.length > 0) {
              if (soundOnRef.current) playChime()
              if (notifyOnRef.current && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const first = filtered.find((o: Order) => o.id === fresh[0])
                new Notification(`New order${fresh.length > 1 ? `s (${fresh.length})` : ''}`, {
                  body: first ? `${first.customerName} · £${first.total.toFixed(2)}` : 'A new order just came in',
                  tag: `order-${fresh[0]}`,
                })
              }
              fresh.forEach((id: number) => seenIdsRef.current!.add(id))
            }
          }

          setOrders(filtered)
        })
        .catch(() => {})
    }

    loadOrders()

    // Polling — works on Vercel (no WebSocket needed)
    const poll = setInterval(loadOrders, 4000)
    setConnected(true)

    return () => {
      clearInterval(poll)
      setConnected(false)
    }
  }, [])

  const handleUpdateStatus = async (orderId: number, status: string) => {
    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)))

    await fetch(apiPath(`/api/orders/${orderId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {
      fetch(apiPath('/api/orders')).then((r) => r.json()).then(({ orders: rows }) => {
        if (rows) setOrders(rows)
      })
    })
  }

  return (
    <>
      <style>{`
        .kitchen-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0C0C0C;
          overflow: hidden;
        }

        .kitchen-page-header {
          background: #080808;
          border-bottom: 1px solid #1a1a1a;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
        }

        .kitchen-page-status {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .kitchen-page-header {
            padding: 12px 14px;
            flex-wrap: wrap;
          }

          .kitchen-page-status {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="kitchen-page">
      {/* Kitchen header */}
      <div className="kitchen-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #D4A017, #C0392B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>🍽️</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3' }}>Kitchen Display</span>
        </div>

        <div className="kitchen-page-status">
          <button
            onClick={() => { unlockAudio(); setSoundOn((s) => !s); if (!soundOn) playChime() }}
            title={soundOn ? 'Mute new-order chime' : 'Unmute new-order chime'}
            style={{ background: soundOn ? 'rgba(46,204,113,0.12)' : '#1a1a1a', border: `1px solid ${soundOn ? 'rgba(46,204,113,0.3)' : '#252525'}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', color: soundOn ? '#2ECC71' : '#78726C', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {soundOn ? '🔔' : '🔕'} {soundOn ? 'Sound on' : 'Sound off'}
          </button>
          <button
            onClick={enableNotifications}
            title={notifyOn ? 'Browser notifications enabled' : 'Enable browser notifications'}
            style={{ background: notifyOn ? 'rgba(46,204,113,0.12)' : '#1a1a1a', border: `1px solid ${notifyOn ? 'rgba(46,204,113,0.3)' : '#252525'}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', color: notifyOn ? '#2ECC71' : '#78726C', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {notifyOn ? '✓' : '+'} Notifications
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#2ECC71' : '#C0392B' }} />
            <span style={{ fontSize: 11, color: connected ? '#2ECC71' : '#C0392B', fontWeight: 600 }}>
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
        </div>
      </div>


      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <KanbanBoard orders={orders} onUpdateStatus={handleUpdateStatus} />
      </div>
      </div>
    </>
  )
}
