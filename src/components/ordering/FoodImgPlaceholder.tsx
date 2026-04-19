import { getCategoryStyle } from '@/lib/categoryStyles'

interface FoodImgPlaceholderProps {
  category: string
  size?: number
}

export function FoodImgPlaceholder({ category, size = 80 }: FoodImgPlaceholderProps) {
  const style = getCategoryStyle(category)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: style.gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {style.icon}
    </div>
  )
}
