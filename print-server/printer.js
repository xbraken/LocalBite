/**
 * ESC/POS receipt formatter.
 * Returns a plain-text receipt string for the given order.
 * When escpos hardware is available, pipe this to the printer.
 */
function formatReceipt(order) {
  const LINE_WIDTH = 32
  const hr = '-'.repeat(LINE_WIDTH)

  function padLine(left, right) {
    const spaces = LINE_WIDTH - left.length - right.length
    return left + ' '.repeat(Math.max(1, spaces)) + right
  }

  const lines = []
  lines.push(hr)
  lines.push(order.restaurantName?.toUpperCase() || 'RESTAURANT')
  lines.push(hr)
  lines.push(`Order: #${String(order.orderId).padStart(4, '0')}`)
  lines.push(`Type: ${order.fulfillmentType || 'Collection'}`)
  lines.push(`Time: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)
  lines.push(hr)

  for (const item of order.items || []) {
    const qty = item.qty > 1 ? `${item.qty}x ` : ''
    lines.push(padLine(qty + item.name, `£${(item.totalPrice * item.qty).toFixed(2)}`))
    for (const mod of item.selectedModifiers || []) {
      if (mod.priceDelta !== 0) {
        lines.push(padLine(`  + ${mod.optionName}`, `£${mod.priceDelta.toFixed(2)}`))
      } else {
        lines.push(`  + ${mod.optionName}`)
      }
    }
  }

  lines.push(hr)
  if (order.discountAmount > 0) {
    lines.push(padLine('Discount', `-£${order.discountAmount.toFixed(2)}`))
  }
  lines.push(padLine('TOTAL', `£${order.total.toFixed(2)}`))
  lines.push(hr)
  lines.push('Thank you for your order!')
  lines.push(hr)
  lines.push('\n\n\n')

  return lines.join('\n')
}

module.exports = { formatReceipt }
