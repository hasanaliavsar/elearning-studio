/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Moonfare brand — replaces indigo `brand.*`
        brand: {
          50:  '#EEF0FF',  // navy soft (selected/active backgrounds)
          100: '#DDE0FA',
          200: '#B8BEEF',
          300: '#8C95E1',
          400: '#5B66CF',
          500: '#2B3AB8',
          600: '#171D97',  // PRIMARY — Moonfare navy
          700: '#101258',  // hover/active
          800: '#0A0C3F',  // navy ink
          900: '#070931',
          950: '#040520',
        },
        // Warm ivory neutrals — replaces gray sidebar dungeon
        ivory: {
          50:  '#FAF8F4',
          100: '#F4F1EB',
          200: '#E8E5DE',
          300: '#D6D2C8',
        },
        ink: {
          DEFAULT: '#1A1A1F',
          muted:   '#5C5A57',
          faint:   '#9A9893',
        },
        sand: {
          DEFAULT: '#D4A574',
          soft:    '#F4ECE0',
        },
        // Sidebar tokens — flipped from slate-900 dark to ivory light
        sidebar: {
          DEFAULT: '#FFFFFF',
          hover:   '#F4F1EB',
          active:  '#EEF0FF',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Tiempos Headline', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        raise: '0 1px 2px rgba(16, 18, 88, 0.04), 0 0 0 1px rgba(16, 18, 88, 0.04)',
        lift:  '0 12px 32px -12px rgba(16, 18, 88, 0.18), 0 0 0 1px rgba(16, 18, 88, 0.06)',
      },
    },
  },
  plugins: [],
}
