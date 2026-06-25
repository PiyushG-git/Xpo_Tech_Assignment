/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // App background - very light blue-gray
        app: {
          bg: '#f0f2f8',
          card: '#ffffff',
        },
        // Sidebar
        sidebar: {
          bg: '#1e2235',
          hover: '#2a3048',
          active: '#2a3048',
          border: '#2e3450',
          text: '#a0aec0',
          heading: '#64748b',
        },
        // Primary blue from design
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
    },
  },
  plugins: [],
}
