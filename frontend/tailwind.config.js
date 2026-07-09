/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        title: ['"Lilita One"', 'cursive'],
        script: ['"Kaushan Script"', 'cursive'],
      },
      colors: {
        gori: {
          primary: '#e11d48',
          secondary: '#fff1f2',
          dark: '#111111',
          accent: '#3b82f6',
          yellow: '#f59e0b',
          surface: '#ffffff',
          background: '#f8fafc',
          orange: '#FF8C00', // Naranja del logo/precios
          green: '#00C896', // Verde de las ensaladas/hojas
          wood: '#1a1a1a', // Fondo oscuro tipo madera
          line: '#333333', // Lineas separadoras
        }
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'soft': '0 4px 20px -2px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
