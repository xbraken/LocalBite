'use client'

import useSWR from 'swr'
import type { MenuByCategory } from '@/types/menu'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function menuUrl() {
  if (typeof window === 'undefined') return '/api/menu'
  const tenant = new URLSearchParams(window.location.search).get('tenant')
  return tenant ? `/api/menu?tenant=${tenant}` : '/api/menu'
}

export function useMenu() {
  const { data, error, isLoading, mutate } = useSWR<{
    menu: MenuByCategory
    restaurant: { id: number; name: string; brandColours: { primary: string; accent: string } | null }
  }>(menuUrl(), fetcher)

  return {
    menu: data?.menu ?? {},
    restaurant: data?.restaurant ?? null,
    isLoading,
    error,
    mutate,
  }
}
