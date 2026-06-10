/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#400106',
          light: '#5c0109',
          dark: '#260101',
        },
        cream: {
          DEFAULT: '#D9B991',
          light: '#EDD9BE',
          lighter: '#F7F0E6',
          dark: '#C4A07A',
        },
        cocoa: {
          DEFAULT: '#402814',
          light: '#5c3a1e',
        },
        olive: {
          DEFAULT: '#0D0C00',
          light: '#1a1900',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 4px 32px rgba(13,12,0,0.07), 0 1px 4px rgba(13,12,0,0.04)',
        float: '0 8px 48px rgba(13,12,0,0.12), 0 2px 8px rgba(13,12,0,0.06)',
        fab: '0 8px 32px rgba(64,1,6,0.35)',
      },
    },
  },
  plugins: [],
}
