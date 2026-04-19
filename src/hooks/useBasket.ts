'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BasketItem } from '@/types/order'

const STORAGE_KEY = 'localbite_basket'

function loadBasket(): BasketItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useBasket() {
  const [items, setItems] = useState<BasketItem[]>([])

  useEffect(() => {
    setItems(loadBasket())
  }, [])

  const save = (next: BasketItem[]) => {
    setItems(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const addItem = useCallback((item: BasketItem) => {
    setItems((prev) => {
      // If same basketId exists (shouldn't happen), replace; otherwise append
      const exists = prev.find((i) => i.basketId === item.basketId)
      const next = exists
        ? prev.map((i) => (i.basketId === item.basketId ? item : i))
        : [...prev, item]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeItem = useCallback((basketId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.basketId !== basketId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateQty = useCallback((basketId: string, qty: number) => {
    setItems((prev) => {
      const next =
        qty <= 0
          ? prev.filter((i) => i.basketId !== basketId)
          : prev.map((i) => (i.basketId === basketId ? { ...i, qty } : i))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearBasket = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
  }, [])

  const subtotal = items.reduce((sum, i) => sum + i.totalPrice * i.qty, 0)
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0)

  return { items, addItem, removeItem, updateQty, clearBasket, subtotal, itemCount }
}
