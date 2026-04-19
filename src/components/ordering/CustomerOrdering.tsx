'use client'

import { useState } from 'react'
import { CategoryNav } from './CategoryNav'
import { MenuCard } from './MenuCard'
import { ItemCustomiserModal } from './ItemCustomiserModal'
import { BasketSidebar } from './BasketSidebar'
import { CategoryLanding } from './CategoryLanding'
import { useBasket } from '@/hooks/useBasket'
import type { MenuItem, MenuByCategory } from '@/types/menu'
import type { BasketItem } from '@/types/order'

interface CategoryMeta {
  name: string
  imageUrl: string | null
  sortOrder: number
}

interface CustomerOrderingProps {
  menu: MenuByCategory
  categories?: CategoryMeta[]
  restaurant: {
    id: number
    name: string
    logo: string | null
    brandColours: { primary: string; accent: string } | null
  }
}

export function CustomerOrdering({ menu, categories: categoryMeta = [], restaurant }: CustomerOrderingProps) {
  // Order categories by the admin-defined sortOrder (from categoryMeta); fall back to menu keys
  const menuKeys = Object.keys(menu)
  const orderedFromMeta = categoryMeta.map((c) => c.name).filter((n) => menuKeys.includes(n))
  const leftovers = menuKeys.filter((k) => !orderedFromMeta.includes(k))
  const categories = [...orderedFromMeta, ...leftovers]
  const categoryImages: Record<string, string | null> = Object.fromEntries(
    categoryMeta.map((c) => [c.name, c.imageUrl])
  )
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)
  const { items, addItem, removeItem, updateQty, subtotal } = useBasket()

  const itemCounts: Record<string, number> = {}
  for (const cat of categories) itemCounts[cat] = menu[cat].length

  const basketCount = items.reduce((s, i) => s + i.qty, 0)

  const handleSelectItem = (item: MenuItem) => {
    if (item.modifierGroups.length > 0) {
      setModalItem(item)
    } else {
      addItem({
        basketId: `${item.id}_${Date.now()}`,
        itemId: item.id,
        name: item.name,
        basePrice: item.basePrice,
        selectedModifiers: [],
        totalPrice: item.basePrice,
        qty: 1,
        customisationLabel: '',
      })
    }
  }

  const handleModalAdd = (item: BasketItem) => {
    addItem(item)
    setModalItem(null)
  }

  // ───── Landing view ─────
  if (activeCategory === null) {
    return (
      <CategoryLanding
        categories={categories}
        itemCounts={itemCounts}
        categoryImages={categoryImages}
        restaurantName={restaurant.name}
        basketCount={basketCount}
        onSelectCategory={setActiveCategory}
        onOpenBasket={() => basketCount > 0 && setActiveCategory(categories[0] ?? null)}
      />
    )
  }

  // ───── Menu view ─────
  const currentItems = menu[activeCategory] ?? []

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0C0C0C' }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, background: '#080808', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, zIndex: 10 }}>
        <button onClick={() => setActiveCategory(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          <span style={{ color: '#5a5450', fontSize: 16 }}>‹</span>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #D4A017, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🍽️</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>{restaurant.name}</span>
        </button>

        <div style={{ display: 'flex', gap: 2, marginLeft: 16 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: activeCategory === cat ? '#1a1a1a' : 'transparent', color: activeCategory === cat ? '#D4A017' : '#5a5450', fontSize: 12, fontWeight: activeCategory === cat ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeCategory === cat ? '2px solid #D4A017' : '2px solid transparent', transition: 'all 0.1s' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, marginTop: 44, overflow: 'hidden' }}>
        <CategoryNav categories={categories} active={activeCategory} onSelect={setActiveCategory} itemCounts={itemCounts} />

        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>{activeCategory}</h2>
            <p style={{ fontSize: 12, color: '#3a3430', marginTop: 2 }}>
              {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {currentItems.map((item) => (
              <MenuCard key={item.id} item={item} onSelect={handleSelectItem} />
            ))}
          </div>

          {currentItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#2a2a2a' }}>
              No items in this category
            </div>
          )}
        </main>

        <BasketSidebar items={items} onRemove={removeItem} onUpdateQty={updateQty} subtotal={subtotal} />
      </div>

      {modalItem && (
        <ItemCustomiserModal item={modalItem} onAdd={handleModalAdd} onClose={() => setModalItem(null)} />
      )}
    </div>
  )
}
