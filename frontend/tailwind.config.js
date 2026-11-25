/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        script: ['"Great Vibes"', '"Brush Script MT"', 'cursive'],
      },
      colors: {
        brand: { 700: '#2e7d32', 500: '#4caf50', 300: '#81c784' },
        danger: { 500: '#ef4444', 600: '#dc2626' },
      },
      boxShadow: { glass: '0 8px 32px rgba(0,0,0,0.35)' },
    },
  },
  plugins: [],
};
