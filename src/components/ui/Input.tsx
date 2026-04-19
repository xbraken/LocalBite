import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const inputStyle = {
  background: '#1a1a1a',
  border: '1px solid #252525',
  borderRadius: 7,
  padding: '10px 12px',
  color: '#F0EBE3',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
} as const

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, color: '#78726C', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{ ...inputStyle, borderColor: error ? '#C0392B' : '#252525' }}
        onFocus={(e) => {
          e.target.style.borderColor = '#D4A017'
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#C0392B' : '#252525'
          props.onBlur?.(e)
        }}
      />
      {error && <span style={{ fontSize: 11, color: '#C0392B' }}>{error}</span>}
    </div>
  )
}
