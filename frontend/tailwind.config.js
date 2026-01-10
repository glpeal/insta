/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        instagram: {
          primary: '#E4405F',
          secondary: '#833AB4',
          tertiary: '#FD1D1D',
          quaternary: '#F77737'
        }
      }
    },
  },
  plugins: [],
}
