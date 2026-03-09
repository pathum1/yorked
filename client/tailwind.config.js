/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yorked: {
          bg: '#0f1923',
          card: '#1a2736',
          accent: '#22c55e',
          gold: '#f59e0b',
          danger: '#ef4444',
          border: '#2d3f52',
          text: '#e2e8f0',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
