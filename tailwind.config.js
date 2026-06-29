/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./src/**/*.{js,ts,jsx,tsx,css,html}",
    "./admin/**/*.{php,html,js}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#1e3a8a',
          DEFAULT: '#0B1F5B', // Navy Blue
          dark: '#050e2d',
        },
        gold: {
          light: '#e5b842',
          DEFAULT: '#D4A017', // Luxury Gold
          dark: '#b2830f',
        },
        cream: '#FAFAFA',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
