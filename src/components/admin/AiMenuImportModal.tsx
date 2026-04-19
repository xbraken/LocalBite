'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ParsedOption { name: string; priceDelta: number }
interface ParsedGroup { name: string; type: 'required' | 'optional'; minChoices: number; maxChoices: number; options: ParsedOption[] }
interface ParsedItem { name: string; description: string; basePrice: number; modifierGroups: ParsedGroup[] }
interface ParsedCategory { name: string; items: ParsedItem[] }
interface ParsedMenu { categories: ParsedCategory[] }

interface Props {
  onClose: () => void
  onImported: () => void
}

function apiPath(base: string) {
  if (typeof window === 'undefined') return base
  const t = new URLSearchParams(window.location.search).get('tenant')
  return t ? `${base}?tenant=${t}` : base
}

export function AiMenuImportModal({ onClose, onImported }: Props) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'input' | 'preview'>('input')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ParsedMenu | null>(null)

  const runParse = async () => {
    setError('')
    if (text.trim().length < 5) { setError('Paste a menu first'); return }
    setParsing(true)
    try {
      const res = await fetch(apiPath('/api/menu/ai-parse'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Parse failed')
      setResult(json.parsed as ParsedMenu)
      setPhase('preview')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const runImport = async () => {
    if (!result) return
    setError('')
    setImporting(true)
    try {
      const res = await fetch(apiPath('/api/menu/bulk-import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      onImported()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const totalItems = result?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, width: 'min(720px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EBE3' }}>AI Menu Import</div>
            <div style={{ fontSize: 11, color: '#78726C', marginTop: 2 }}>Paste a menu. Claude Haiku will parse categories, items, prices, and modifiers.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#78726C', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {error && (
            <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 7, background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', color: '#E88070', fontSize: 12 }}>{error}</div>
          )}

          {phase === 'input' && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'Paste menu here, e.g.\n\nSTARTERS\nSpring Rolls — £4.50\nPrawn Toast — £5.00\n\nMAINS\nKung Pao Chicken — Small £6.50 / Large £9.50\n  Extras: Extra chicken +£2, Extra veg +£1'}
                style={{ width: '100%', minHeight: 280, background: '#111', border: '1px solid #222', borderRadius: 8, padding: 14, color: '#F0EBE3', fontSize: 13, fontFamily: 'ui-monospace, monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: '#4a4440', marginTop: 8 }}>
                {text.length.toLocaleString()} characters · Claude Haiku 4.5
              </div>
            </>
          )}

          {phase === 'preview' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: '#78726C' }}>
                Parsed <strong style={{ color: '#D4A017' }}>{totalItems}</strong> items across <strong style={{ color: '#D4A017' }}>{result.categories.length}</strong> categories. Review before importing.
              </div>
              {result.categories.map((cat, ci) => (
                <div key={ci} style={{ border: '1px solid #1a1a1a', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#F0EBE3', marginBottom: 8 }}>{cat.name} <span style={{ fontSize: 11, fontWeight: 500, color: '#78726C' }}>· {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cat.items.map((it, ii) => (
                      <div key={ii} style={{ padding: '9px 12px', background: '#0a0a0a', borderRadius: 7, border: '1px solid #161616' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#F0EBE3' }}>{it.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#D4A017' }}>£{it.basePrice.toFixed(2)}</span>
                        </div>
                        {it.description && <div style={{ fontSize: 11, color: '#78726C', marginTop: 3 }}>{it.description}</div>}
                        {it.modifierGroups.length > 0 && (
                          <div style={{ marginTop: 6, fontSize: 10, color: '#5a5450' }}>
                            {it.modifierGroups.map((g) => `${g.name} (${g.options.length})`).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {result.categories.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#78726C', fontSize: 12 }}>No menu items recognised. Try adding more structure.</div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {phase === 'input' && (
            <>
              <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={runParse}>{parsing ? 'Parsing…' : 'Parse with AI'}</Button>
            </>
          )}
          {phase === 'preview' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setPhase('input')}>Back</Button>
              <Button size="sm" onClick={runImport} disabled={importing || totalItems === 0}>{importing ? 'Importing…' : `Import ${totalItems} item${totalItems !== 1 ? 's' : ''}`}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
