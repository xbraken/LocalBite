'use client'

import { useState, useEffect } from 'react'

interface ElapsedTimerProps {
  createdAt: string
}

export function ElapsedTimer({ createdAt }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
      setElapsed(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  const color = mins >= 20 ? '#C0392B' : mins >= 10 ? '#D4A017' : '#2ECC71'

  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
      {mins > 0 ? `${mins}m ` : ''}{secs}s
    </span>
  )
}
