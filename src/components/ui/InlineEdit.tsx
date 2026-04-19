'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineEditProps {
  value: string | number
  onSave: (value: string) => void
  type?: 'text' | 'number'
  suffix?: string
  prefix?: string
}

export function InlineEdit({ value, onSave, type = 'text', suffix, prefix }: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== String(value)) onSave(draft)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(String(value))
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') cancel()
        }}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #D4A017',
          color: '#F0EBE3',
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: 600,
          width: 70,
          outline: 'none',
          padding: '2px 0',
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        color: '#F0EBE3',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        borderBottom: '1px dashed #3a3430',
        paddingBottom: 1,
      }}
    >
      {prefix}{value}{suffix}
    </span>
  )
}
