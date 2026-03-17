/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aegis-dark': '#1a1c1e',
        'aegis-card': '#25282c',
        'aegis-input': '#1e2127',
        'aegis-accent': '#e67e22',
      },
    },
  },
  plugins: [],
}
