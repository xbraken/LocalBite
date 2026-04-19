import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded transition-all cursor-pointer select-none'

  const variants = {
    primary: 'bg-brand-gradient text-white hover:opacity-90 disabled:opacity-40',
    outline: 'border border-border text-text-primary bg-transparent hover:border-brand-gold hover:text-brand-gold disabled:opacity-40',
    ghost: 'text-text-muted bg-transparent hover:text-text-primary hover:bg-bg-surface3 disabled:opacity-40',
    danger: 'bg-brand-crimson text-white hover:opacity-90 disabled:opacity-40',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
