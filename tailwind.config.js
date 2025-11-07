/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}", // Scans all HTML and JS files
    "./app.js"      // Specifically scans app.js
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}