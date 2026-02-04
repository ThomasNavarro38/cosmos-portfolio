/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#0f172a',
        nebula: '#7c3aed',
        magic: '#2dd4bf',
      },
      backgroundImage: {
        'cosmic-gradient': 'radial-gradient(circle at center, #0f172a 0%, #000000 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

