import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

const bodySchema = z.object({
  text: z.string().min(5).max(20000),
})

const SYSTEM_PROMPT = `You are a menu parsing assistant for a takeaway restaurant platform.

Input: raw menu text pasted by a restaurant owner (may include categories, items, prices, modifiers, sizes, toppings, meal deals).

Output: a single JSON object matching this exact shape. Do not include any prose, markdown fences, or explanation — emit ONLY the JSON.

{
  "categories": [
    {
      "name": "Starters",
      "items": [
        {
          "name": "Spring Rolls",
          "description": "Crispy vegetable rolls",
          "basePrice": 4.50,
          "modifierGroups": [
            {
              "name": "Dipping sauce",
              "type": "required",
              "minChoices": 1,
              "maxChoices": 1,
              "options": [
                { "name": "Sweet chilli", "priceDelta": 0 },
                { "name": "Soy sauce", "priceDelta": 0 }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- basePrice is a number in the restaurant's currency (GBP). If a price looks like "£5.50" or "5.50" → 5.50.
- If the item has size variants (e.g. Small £6 / Large £9), set basePrice to the SMALLEST size and create a required modifier group called "Size" with options for each size and priceDelta = (size price − basePrice).
- Toppings / extras / add-ons are an optional modifier group (type: "optional") with maxChoices reasonable for the category (toppings: 5, sauces: 2, extras: 10).
- If no modifiers are mentioned, return modifierGroups: [].
- Always include a description even if you have to infer a short one from context; if truly unknown, use an empty string "".
- Category names should be Title Case. Group items under inferred categories if the input lacks explicit headings.
- Never invent items. Only parse what is clearly present in the input.
- If the input is unparseable or not a menu, return { "categories": [] }.`

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const client = new Anthropic({ apiKey })

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: parsed.data.text }],
    })

    const textBlock = res.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 })
    }

    let json: unknown
    try {
      json = JSON.parse(textBlock.text)
    } catch {
      const match = textBlock.text.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Model returned non-JSON', raw: textBlock.text }, { status: 502 })
      json = JSON.parse(match[0])
    }

    return NextResponse.json({ parsed: json, usage: res.usage })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
