/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leather: {
          50: '#F5F5F5',
          100: '#EFEBE9',
          200: '#D7CCC8',
          300: '#A1887F',
          400: '#8D6E63',
          500: '#6D4C41',
          600: '#5D4037',
          700: '#3E2723',
          800: '#2E1A17',
          900: '#1A0E0A',
        }
      }
    },
  },
  plugins: [],
}