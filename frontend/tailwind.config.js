/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C2331',
        surface: '#F7F8FA',
        'surface-alt': '#EDEFF3',
        primary: {
          DEFAULT: '#1E3A5F',
          dark: '#152A47',
          light: '#2C4E7A',
        },
        accent: {
          DEFAULT: '#B8842F',
          light: '#D9A65C',
        },
        border: '#D8DCE3',
        muted: '#6B7280',
        success: '#2F7D5A',
        danger: '#B3441E',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
