export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}', '../shared/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ration: {
          green: '#16a34a',
          'green-hover': '#15803d',
          yellow: '#FDCD2F',
          'yellow-hover': '#F4C430',
          dark: '#12343A',
          'dark-hover': '#0F2A30',
        },
        primary: {
          50: '#FFF9E6',
          100: '#FFF3CC',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FDCD2F',
          500: '#FDCD2F',
          600: '#F4C430',
          700: '#D9AA26',
          800: '#B38A1F',
          900: '#8C6B18',
        },
      },
    },
  },
  plugins: [],
}
