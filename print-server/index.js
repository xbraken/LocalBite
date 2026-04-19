const express = require('express')
const cors = require('cors')
const { formatReceipt } = require('./printer')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.post('/print', (req, res) => {
  const order = req.body
  if (!order) return res.status(400).json({ error: 'No order data' })

  const receipt = formatReceipt(order)

  // Log to console (simulate print for dev)
  console.log('\n========= RECEIPT =========')
  console.log(receipt)
  console.log('===========================\n')

  // TODO: When escpos hardware is connected:
  // const Printer = require('escpos').Printer
  // const USB = require('escpos-usb')
  // const device = new USB()
  // const printer = new Printer(device)
  // device.open(() => {
  //   printer.text(receipt).cut().close()
  // })

  res.json({ ok: true, receipt })
})

app.listen(PORT, () => {
  console.log(`Print server running on http://localhost:${PORT}`)
  console.log('POST /print to print a receipt')
})
