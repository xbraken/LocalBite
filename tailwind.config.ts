import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4A017',
          crimson: '#C0392B',
          success: '#2ECC71',
        },
        bg: {
          base: '#0C0C0C',
          surface1: '#0f0f0f',
          surface2: '#161616',
          surface3: '#1a1a1a',
          card: '#161616',
        },
        border: {
          DEFAULT: '#252525',
          subtle: '#222222',
          muted: '#1e1e1e',
        },
        text: {
          primary: '#F0EBE3',
          muted: '#78726C',
          faint: '#4a4440',
          ghost: '#3a3430',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #D4A017, #C0392B)',
        'brand-gradient-hover': 'linear-gradient(135deg, #e0aa1e, #d44030)',
      },
    },
  },
  plugins: [],
}

export default config
