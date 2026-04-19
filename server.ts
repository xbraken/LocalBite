import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer, WebSocket } from 'ws'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

interface ExtendedWS extends WebSocket {
  tenantId?: string
  isAlive: boolean
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  const wss = new WebSocketServer({ noServer: true })

  // Store globally so API routes can broadcast
  ;(globalThis as Record<string, unknown>).__wss = wss

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url ?? '')
    if (pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  })

  wss.on('connection', (ws: WebSocket, req) => {
    const extWs = ws as ExtendedWS
    extWs.isAlive = true

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
    extWs.tenantId = url.searchParams.get('tenantId') ?? undefined

    extWs.on('pong', () => { extWs.isAlive = true })
    extWs.on('error', console.error)
    extWs.on('close', () => { extWs.isAlive = false })

    extWs.send(JSON.stringify({ event: 'connected', data: { tenantId: extWs.tenantId } }))
  })

  // Heartbeat to clean up dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWS
      if (!extWs.isAlive) { extWs.terminate(); return }
      extWs.isAlive = false
      extWs.ping()
    })
  }, 30000)

  wss.on('close', () => clearInterval(heartbeat))

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket ready on ws://${hostname}:${port}/api/ws`)
  })
})
