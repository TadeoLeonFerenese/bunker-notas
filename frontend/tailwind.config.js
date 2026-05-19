/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bunker-bg': '#F8F9FA',
        'bunker-dark': '#1A202C',
        'bunker-accent': '#E94560',
        'bunker-gray': '#718096',
      },
    },
  },
  plugins: [],
};