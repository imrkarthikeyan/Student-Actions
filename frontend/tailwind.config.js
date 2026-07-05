/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f1',
          100: '#ffdfdf',
          200: '#ffc5c5',
          300: '#ff9d9d',
          400: '#fd6a6a',
          500: '#f43535',
          600: '#e01414',
          700: '#bc0d0d',
          800: '#9b0f11',
          900: '#801315',
          950: '#460405',
        },
        // Pure neutral grays (no blue tint), values swapped end-to-end from the
        // prior dark theme so every existing bg-gray-*/text-gray-* class in the
        // app now reads as white/black instead — no component files touched.
        gray: {
          50: '#000000',
          100: '#0f0f11',
          200: '#19191c',
          300: '#29292e',
          400: '#3f3f46',
          500: '#57575f',
          600: '#77777f',
          700: '#a3a3aa',
          800: '#cfcfd3',
          900: '#e9e9eb',
          950: '#f7f7f8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        // Soft elevation with a faint red-tinted glow underneath.
        soft: '0 1px 2px rgba(0,0,0,0.12), 0 12px 32px -12px rgba(224,20,20,0.18)',
        'soft-lg': '0 2px 4px rgba(0,0,0,0.14), 0 24px 48px -16px rgba(224,20,20,0.22)',
        'glow-red': '0 0 24px rgba(224, 20, 20, 0.45)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
