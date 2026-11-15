/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bordeaux de la marque et or du logo.
        wine: {
          50: '#fbf2f0',
          100: '#f4dfdc',
          200: '#e6bcb8',
          500: '#b8413f',
          600: '#9c272e',
          700: '#7a1c2b',
          800: '#571524',
          900: '#3d0d19',
          950: '#2a0911',
        },
        gold: {
          100: '#fdf3d7',
          300: '#f9db8f',
          400: '#f0b862',
          500: '#dd7c3a',
          600: '#b9602a',
        },
        ivory: '#fbf7f2',
        ink: '#2b1a1d',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
