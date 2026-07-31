/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#14213D',
          700: '#2B3A55',
          500: '#5B6472',
          300: '#94A0B2',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F7F8FA',
          border: '#E2E5EA',
        },
        brand: {
          50: '#EAF1FB',
          100: '#D2E1F6',
          500: '#1F4B99',
          600: '#1A3F80',
          700: '#173B7A',
        },
        status: {
          pending: '#64748B',
          pendingBg: '#F1F5F9',
          received: '#2563EB',
          receivedBg: '#EFF6FF',
          paid: '#16A34A',
          paidBg: '#F0FDF4',
          dueSoon: '#D97706',
          dueSoonBg: '#FFFBEB',
          overdue: '#DC2626',
          overdueBg: '#FEF2F2',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(20, 33, 61, 0.06), 0 1px 3px 0 rgba(20, 33, 61, 0.08)',
      },
    },
  },
  plugins: [],
};
