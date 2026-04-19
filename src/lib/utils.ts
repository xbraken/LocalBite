import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPrice(p: number) {
  return `£${p.toFixed(2)}`
}

export function formatOrderId(id: number) {
  return `#${String(id).padStart(4, '0')}`
}
