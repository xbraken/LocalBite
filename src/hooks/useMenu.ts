'use client'

import useSWR from 'swr'
import type { MenuByCategory } from '@/types/menu'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useMenu() {
  const { data, error, isLoading, mutate } = useSWR<{
    menu: MenuByCategory
    restaurant: { id: number; name: string; brandColours: { primary: string; accent: string } | null }
  }>('/api/menu', fetcher)

  return {
    menu: data?.menu ?? {},
    restaurant: data?.restaurant ?? null,
    isLoading,
    error,
    mutate,
  }
}
