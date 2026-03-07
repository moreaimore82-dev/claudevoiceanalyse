/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070E1B',
          900: '#0B1629',
          800: '#111F3A',
          700: '#1A2F55',
          600: '#243A6A',
        },
        accent: {
          DEFAULT: '#2B7FFF',
          hover: '#1A6EEE',
          muted: 'rgba(43,127,255,0.15)',
        },
      },
    },
  },
  plugins: [],
}
