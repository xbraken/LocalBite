'use client'

import { useEffect, useRef, useReducer, useCallback } from 'react'
import type { Order } from '@/types/order'

type KitchenState = {
  orders: Order[]
  connected: boolean
}

type KitchenAction =
  | { type: 'SET_ORDERS'; orders: Order[] }
  | { type: 'NEW_ORDER'; order: Order }
  | { type: 'UPDATE_ORDER'; orderId: number; status: string }
  | { type: 'SET_CONNECTED'; connected: boolean }

function reducer(state: KitchenState, action: KitchenAction): KitchenState {
  switch (action.type) {
    case 'SET_ORDERS':
      return { ...state, orders: action.orders }
    case 'NEW_ORDER':
      return { ...state, orders: [action.order, ...state.orders] }
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, status: action.status as Order['status'] } : o
        ),
      }
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected }
    default:
      return state
  }
}

export function useKitchenSocket(tenantId: string) {
  const [state, dispatch] = useReducer(reducer, { orders: [], connected: false })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()
  const reconnectDelay = useRef(1000)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/api/ws?tenantId=${tenantId}`)
    wsRef.current = ws

    ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', connected: true })
      reconnectDelay.current = 1000
    }

    ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data)
        if (event === 'order:new') dispatch({ type: 'NEW_ORDER', order: data })
        if (event === 'order:updated') dispatch({ type: 'UPDATE_ORDER', orderId: data.orderId, status: data.status })
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      dispatch({ type: 'SET_CONNECTED', connected: false })
      // Exponential backoff reconnect (max 30s)
      reconnectRef.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
        connect()
      }, reconnectDelay.current)
    }

    ws.onerror = () => ws.close()
  }, [tenantId])

  useEffect(() => {
    const t = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null
    const ordersUrl = t ? `/api/orders?tenant=${t}` : '/api/orders'

    const loadOrders = () => {
      fetch(ordersUrl)
        .then((r) => r.json())
        .then(({ orders }) => {
          if (!orders) return
          const active = orders.filter((o: Order) => o.status !== 'cancelled')
          dispatch({ type: 'SET_ORDERS', orders: active })
        })
        .catch(() => {})
    }

    loadOrders()
    connect()

    // Polling fallback (works on Vercel where WS is unavailable)
    const poll = setInterval(loadOrders, 5000)

    return () => {
      clearInterval(poll)
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return state
}
