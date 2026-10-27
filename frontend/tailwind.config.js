/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FFFDF9',
          100: '#FAF7F2',
          200: '#F5EFE6',
          300: '#EADFCF',
          400: '#D5C4AC',
        },
        forest: {
          DEFAULT: '#153828',
          800: '#153828',
          900: '#0E281C',
          light: '#1B4332',
          accent: '#2D6A4F',
        },
        terracotta: {
          DEFAULT: '#C44D34',
          hover: '#B03D25',
          light: '#E07A5F',
          dark: '#8C301D',
          text: '#A8402B', // 5.7:1 on parchment, for small text
          50: '#FDF4F2',
        },
        ochre: {
          DEFAULT: '#D4A373',
          light: '#E9C46A',
          50: '#FBF3E4',
        },
        ink: '#292524',
        muted: '#6B5E55', // 5.8:1 on parchment
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '16px', control: '12px' },
      boxShadow: {
        warm: '0 4px 20px -2px rgba(41, 37, 36, 0.08), 0 2px 6px -1px rgba(41, 37, 36, 0.04)',
        'warm-lg': '0 10px 25px -3px rgba(41, 37, 36, 0.12), 0 4px 10px -2px rgba(41, 37, 36, 0.06)',
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '3rem' }],
      },
      screens: { xs: '390px' },
    },
  },
  plugins: [],
}
