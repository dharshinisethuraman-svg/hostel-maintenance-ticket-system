/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-main': 'var(--bg-main)',
        'app-card': 'var(--bg-card)',
        'app-primary': 'var(--accent-primary)',
        'app-secondary': 'var(--accent-secondary)',
        'app-text': 'var(--text-main)',
        'app-muted': 'var(--text-muted)',
        'app-border': 'var(--border-color)',
        brand: {
          light: '#2E7BB8',
          DEFAULT: '#1D4E89',
          dark: '#123058',
        },
        accent: {
          teal: '#0E8C9C',
        }
      }
    },
  },
  plugins: [],
}
