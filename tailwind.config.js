/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        arabic: [
          '"IBM Plex Sans Arabic"',
          '"Noto Sans Arabic"',
          '"Segoe UI"',
          'Tahoma',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
