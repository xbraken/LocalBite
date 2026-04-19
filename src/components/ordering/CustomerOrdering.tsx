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
  const [basketOpen, setBasketOpen] = useState(false)
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
    <div className="co-root">
      <style>{`
        .co-root { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: #0C0C0C; }
        .co-topbar { position: relative; height: 44px; background: #080808; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; padding: 0 16px; gap: 12px; z-index: 10; flex-shrink: 0; }
        .co-topbar-tabs { display: flex; gap: 2px; margin-left: 16px; overflow-x: auto; flex: 1; min-width: 0; scrollbar-width: none; }
        .co-topbar-tabs::-webkit-scrollbar { display: none; }
        .co-body { display: flex; flex: 1; overflow: hidden; min-height: 0; }
        .co-main { flex: 1; overflow-y: auto; padding: 20px; min-width: 0; }
        .co-mobile-cats { display: none; }
        .co-basket-fab { display: none; }
        .co-basket-drawer { display: contents; }

        @media (max-width: 768px) {
          .co-topbar-tabs { display: none; }
          .co-sidenav { display: none !important; }
          .co-basket-desktop { display: none !important; }
          .co-mobile-cats {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding: 10px 12px;
            background: #0C0C0C;
            border-bottom: 1px solid #1a1a1a;
            flex-shrink: 0;
            scrollbar-width: none;
          }
          .co-mobile-cats::-webkit-scrollbar { display: none; }
          .co-mobile-cat-btn {
            flex-shrink: 0;
            padding: 7px 14px;
            border-radius: 999px;
            border: 1px solid #252525;
            background: #111;
            color: #78726C;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            white-space: nowrap;
          }
          .co-mobile-cat-btn.active {
            background: #D4A017;
            color: #0C0C0C;
            border-color: #D4A017;
          }
          .co-main { padding: 16px; }
          .co-basket-fab {
            display: flex;
            position: fixed;
            bottom: 18px;
            left: 16px;
            right: 16px;
            padding: 14px 20px;
            border-radius: 999px;
            border: none;
            background: linear-gradient(135deg, #D4A017, #C0392B);
            color: #fff;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            font-family: inherit;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 16px 32px rgba(0,0,0,0.45);
            z-index: 40;
          }
          .co-basket-fab:disabled { background: #1a1a1a; color: #3a3430; cursor: not-allowed; box-shadow: none; }
          .co-basket-drawer-root {
            position: fixed;
            inset: 0;
            z-index: 100;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: flex-end;
          }
          .co-basket-drawer-panel {
            width: min(340px, 100%);
            background: #0f0f0f;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .co-basket-drawer-close {
            background: none; border: none; color: #78726C; font-size: 22px; cursor: pointer; padding: 8px 14px; align-self: flex-end;
          }
        }
      `}</style>

      {/* Top bar */}
      <div className="co-topbar">
        <button onClick={() => setActiveCategory(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
          <span style={{ color: '#5a5450', fontSize: 16 }}>‹</span>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #D4A017, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🍽️</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F0EBE3' }}>{restaurant.name}</span>
        </button>

        <div className="co-topbar-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: activeCategory === cat ? '#1a1a1a' : 'transparent', color: activeCategory === cat ? '#D4A017' : '#5a5450', fontSize: 12, fontWeight: activeCategory === cat ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeCategory === cat ? '2px solid #D4A017' : '2px solid transparent', transition: 'all 0.1s', whiteSpace: 'nowrap' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile horizontal category strip */}
      <div className="co-mobile-cats">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`co-mobile-cat-btn ${activeCategory === cat ? 'active' : ''}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="co-body">
        <div className="co-sidenav" style={{ display: 'flex' }}>
          <CategoryNav categories={categories} active={activeCategory} onSelect={setActiveCategory} itemCounts={itemCounts} />
        </div>

        <main className="co-main">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>{activeCategory}</h2>
            <p style={{ fontSize: 12, color: '#3a3430', marginTop: 2 }}>
              {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, paddingBottom: 80 }}>
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

        <div className="co-basket-desktop" style={{ display: 'flex' }}>
          <BasketSidebar items={items} onRemove={removeItem} onUpdateQty={updateQty} subtotal={subtotal} />
        </div>
      </div>

      {/* Mobile floating basket button */}
      <button
        className="co-basket-fab"
        onClick={() => basketCount > 0 && setBasketOpen(true)}
        disabled={basketCount === 0}
      >
        <span>🛒 {basketCount} item{basketCount !== 1 ? 's' : ''}</span>
        <span>View basket ›</span>
      </button>

      {/* Mobile basket drawer */}
      {basketOpen && (
        <div className="co-basket-drawer-root" onClick={() => setBasketOpen(false)}>
          <div className="co-basket-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <button className="co-basket-drawer-close" onClick={() => setBasketOpen(false)}>×</button>
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <BasketSidebar items={items} onRemove={removeItem} onUpdateQty={updateQty} subtotal={subtotal} />
            </div>
          </div>
        </div>
      )}

      {modalItem && (
        <ItemCustomiserModal item={modalItem} onAdd={handleModalAdd} onClose={() => setModalItem(null)} />
      )}
    </div>
  )
}
