'use client'

import { useEffect } from 'react'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  width?: number
  maxHeight?: string
}

export function Modal({ onClose, children, width = 480, maxHeight = '88vh' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111',
          border: '1px solid #222',
          borderRadius: 16,
          width,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
