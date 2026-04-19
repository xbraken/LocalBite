import type { WebSocket, WebSocketServer } from 'ws'

interface ExtendedWS extends WebSocket {
  tenantId?: string
  isAlive?: boolean
}

export function broadcast(tenantId: string, event: string, data: unknown) {
  const wss = (globalThis as Record<string, unknown>).__wss as WebSocketServer | undefined
  if (!wss) return

  const payload = JSON.stringify({ event, data })
  wss.clients.forEach((client) => {
    const ws = client as ExtendedWS
    if (ws.tenantId === tenantId && ws.readyState === 1) {
      ws.send(payload)
    }
  })
}

export function broadcastAll(event: string, data: unknown) {
  const wss = (globalThis as Record<string, unknown>).__wss as WebSocketServer | undefined
  if (!wss) return

  const payload = JSON.stringify({ event, data })
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload)
    }
  })
}
