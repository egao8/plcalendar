/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        profit: '#10b981',
        loss: '#ef4444',
        neutral: '#fbbf24',
        // Professional Quant Theme
        quant: {
          bg: '#0a0a0a',
          surface: '#141414',
          card: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#3b82f6',
          accentLight: '#60a5fa',
          accentDark: '#2563eb',
        }
      },
      backgroundImage: {
        'quant-gradient': 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)',
        'card-gradient': 'linear-gradient(135deg, #1a1f3a 0%, #0f1629 100%)',
      },
      boxShadow: {
        'quant': '0 4px 24px rgba(99, 102, 241, 0.1)',
        'quant-lg': '0 8px 32px rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
}

