/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 400: '#6b8cff', 500: '#4f6ef7', 600: '#3b55e6' },
        lc: {
          bg:      '#0d0d0d',
          surface: '#161616',
          border:  '#2a2a2a',
          hover:   '#1e1e1e',
          text:    '#e0e0e0',
          muted:   '#888888',
          faint:   '#444444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}