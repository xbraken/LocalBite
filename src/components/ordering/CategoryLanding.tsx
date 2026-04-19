'use client'

import { getCategoryStyle } from '@/lib/categoryStyles'

interface CategoryLandingProps {
  categories: string[]
  itemCounts: Record<string, number>
  categoryImages?: Record<string, string | null>
  restaurantName: string
  basketCount: number
  onSelectCategory: (cat: string) => void
  onOpenBasket: () => void
}

// Decorative SVG shown faintly behind each category card
function CategoryArtwork({ category, accent }: { category: string; accent: string }) {
  const common = { fill: 'none', stroke: accent, strokeWidth: 1.5, opacity: 0.22 } as const
  if (category === 'Starters') {
    return (
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="100" cy="100" r="80" {...common} />
        <circle cx="100" cy="100" r="55" {...common} />
        <circle cx="100" cy="100" r="30" {...common} />
        <line x1="20" y1="100" x2="180" y2="100" {...common} />
        <line x1="100" y1="20" x2="100" y2="180" {...common} />
        <circle cx="100" cy="100" r="10" fill={accent} opacity="0.15" />
      </svg>
    )
  }
  if (category === 'Mains') {
    return (
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <ellipse cx="100" cy="100" rx="70" ry="45" {...common} />
        <ellipse cx="100" cy="100" rx="40" ry="25" {...common} />
        <circle cx="100" cy="100" r="8" fill={accent} opacity="0.18" />
      </svg>
    )
  }
  if (category === 'Rice & Noodles') {
    return (
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M 10 80 Q 60 50, 100 80 T 190 80" {...common} />
        <path d="M 10 110 Q 60 80, 100 110 T 190 110" {...common} strokeDasharray="4 4" />
        <path d="M 10 140 Q 60 110, 100 140 T 190 140" {...common} />
      </svg>
    )
  }
  if (category === 'Drinks') {
    return (
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M 75 50 L 125 50 L 120 160 L 80 160 Z" {...common} />
        <ellipse cx="100" cy="120" rx="18" ry="6" fill={accent} opacity="0.15" />
      </svg>
    )
  }
  // Generic fallback
  return (
    <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <circle cx="100" cy="100" r="70" {...common} />
      <circle cx="100" cy="100" r="45" {...common} />
    </svg>
  )
}

export function CategoryLanding({ categories, itemCounts, categoryImages = {}, restaurantName, basketCount, onSelectCategory, onOpenBasket }: CategoryLandingProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', padding: '56px 40px 80px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #D4A017, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3' }}>{restaurantName}</div>
        </div>

        {basketCount > 0 && (
          <button onClick={onOpenBasket} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, border: '1px solid #252525', background: '#111', color: '#F0EBE3', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#D4A017', color: '#0C0C0C', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{basketCount}</span>
            View basket
          </button>
        )}
      </div>

      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: '#F0EBE3', lineHeight: 1.1, margin: 0 }}>What are you craving?</h1>
        <p style={{ fontSize: 14, color: '#5a5450', marginTop: 12 }}>Choose a category to browse our full menu</p>
      </div>

      {/* Category grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {categories.map((cat, idx) => {
          const cs = getCategoryStyle(cat)
          const count = itemCounts[cat] ?? 0
          const customImg = categoryImages[cat]
          // First card is larger (spans two columns on wider screens, matching prototype)
          const isFeatured = idx === 0
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                position: 'relative',
                background: customImg ? `url(${customImg}) center/cover` : cs.gradient,
                border: '1px solid #1a1a1a',
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0,
                height: isFeatured ? 260 : 220,
                gridColumn: isFeatured ? 'span 2' : 'span 1',
                textAlign: 'left',
                transition: 'transform 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = cs.accent + '66'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a1a1a'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
            >
              {/* Dark gradient overlay for readability when a custom image is set */}
              {customImg && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)' }} />
              )}

              {/* Artwork layer (only when no custom image) */}
              {!customImg && <CategoryArtwork category={cat} accent={cs.accent} />}

              {/* Item count pill */}
              <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700, color: cs.accent, background: 'rgba(0,0,0,0.45)', border: `1px solid ${cs.accent}44`, borderRadius: 999, padding: '4px 10px' }}>
                {count} item{count !== 1 ? 's' : ''}
              </div>

              {/* Label */}
              <div style={{ position: 'absolute', bottom: 18, left: 20, right: 20 }}>
                <div style={{ fontSize: isFeatured ? 28 : 22, fontWeight: 900, color: '#F0EBE3', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1, textShadow: customImg ? '0 2px 8px rgba(0,0,0,0.6)' : undefined }}>
                  {cat}
                </div>
                <div style={{ width: 42, height: 3, background: cs.accent, borderRadius: 2, marginTop: 8 }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
