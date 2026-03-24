/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '480px',   // Mobile
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
    },
    extend: {},
  },
  plugins: [],
}
