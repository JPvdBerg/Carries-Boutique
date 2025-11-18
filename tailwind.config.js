/** @type {import('tailwindcss').Config} */
module.exports = {
  // OLD: content: ["./**/*.{html,js}"], <-- This was scanning EVERYTHING
  
  // NEW: This only scans HTML and JS files in your main folder
  content: ["./*.{html,js}"], 
  
  theme: {
    extend: {},
  },
  plugins: [],
}