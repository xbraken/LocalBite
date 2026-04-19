export interface CategoryStyle {
  gradient: string
  accent: string
  icon: string
  svgBg: string
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Starters: {
    gradient: 'linear-gradient(135deg, #1a3a2a 0%, #0d1f15 100%)',
    accent: '#2ECC71',
    icon: '🥟',
    svgBg: '#0d1f15',
  },
  Mains: {
    gradient: 'linear-gradient(135deg, #3a1a1a 0%, #1f0d0d 100%)',
    accent: '#E74C3C',
    icon: '🍜',
    svgBg: '#1f0d0d',
  },
  'Rice & Noodles': {
    gradient: 'linear-gradient(135deg, #3a2f1a 0%, #1f180d 100%)',
    accent: '#D4A017',
    icon: '🍚',
    svgBg: '#1f180d',
  },
  Drinks: {
    gradient: 'linear-gradient(135deg, #1a2a3a 0%, #0d151f 100%)',
    accent: '#3B82F6',
    icon: '🧋',
    svgBg: '#0d151f',
  },
  Pizzas: {
    gradient: 'linear-gradient(135deg, #3a2a1a 0%, #1f150d 100%)',
    accent: '#F97316',
    icon: '🍕',
    svgBg: '#1f150d',
  },
  Burgers: {
    gradient: 'linear-gradient(135deg, #2a1a3a 0%, #150d1f 100%)',
    accent: '#A855F7',
    icon: '🍔',
    svgBg: '#150d1f',
  },
  Sides: {
    gradient: 'linear-gradient(135deg, #1a3a30 0%, #0d1f18 100%)',
    accent: '#10B981',
    icon: '🍟',
    svgBg: '#0d1f18',
  },
  Breads: {
    gradient: 'linear-gradient(135deg, #3a2a15 0%, #1f160a 100%)',
    accent: '#F59E0B',
    icon: '🫓',
    svgBg: '#1f160a',
  },
  Desserts: {
    gradient: 'linear-gradient(135deg, #3a1a2a 0%, #1f0d15 100%)',
    accent: '#EC4899',
    icon: '🍮',
    svgBg: '#1f0d15',
  },
  default: {
    gradient: 'linear-gradient(135deg, #1a1a2a 0%, #0d0d15 100%)',
    accent: '#D4A017',
    icon: '🍽️',
    svgBg: '#0d0d15',
  },
}

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.default
}
