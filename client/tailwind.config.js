/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf3ef',
          100: '#fae4da',
          200: '#f4c6b3',
          300: '#eca184',
          400: '#e37c5c',
          500: '#d95f3d',
          600: '#bd4c2f',
          700: '#973c27',
          800: '#7a3324',
          900: '#652c22',
        },
        ink: {
          50: '#f7f6f4',
          100: '#eceae6',
          200: '#d9d5cd',
          300: '#bfb9ac',
          400: '#a29a88',
          500: '#877e6c',
          600: '#6d6656',
          700: '#595448',
          800: '#4a463d',
          900: '#3d3a33',
          950: '#1f1d19',
        },
      },
      fontFamily: {
        display: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(31, 29, 25, 0.08)',
        pop: '0 8px 32px rgba(31, 29, 25, 0.16)',
      },
    },
  },
  plugins: [],
};
