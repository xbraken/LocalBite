'use client'

interface ToggleProps {
  on: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function Toggle({ on, onChange, disabled }: ToggleProps) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 34,
        height: 19,
        borderRadius: 10,
        background: on ? '#D4A017' : '#252525',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
      role="switch"
      aria-checked={on}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: on ? 18 : 3,
          transition: 'left 0.2s',
        }}
      />
    </div>
  )
}
