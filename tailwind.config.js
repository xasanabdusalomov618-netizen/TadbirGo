/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        accentSoft: 'var(--accent-soft)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '6px 6px 14px var(--sd), -6px -6px 14px var(--sl)',
        'soft-sm': '3px 3px 8px var(--sd), -3px -3px 8px var(--sl)',
        'soft-lg': '14px 14px 30px var(--sd), -12px -12px 30px var(--sl)',
        'soft-inset': 'inset 4px 4px 9px var(--sd), inset -4px -4px 9px var(--sl)',
        'soft-inset-sm': 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
        glow: '0 10px 30px -8px var(--accent-glow)',
      },
      borderRadius: {
        soft: '1.25rem',
        'soft-lg': '1.75rem',
        'soft-xl': '2.25rem',
      },
      animation: {
        'fade-up': 'fadeUp .45s cubic-bezier(.2,.7,.3,1) both',
        'fade-in': 'fadeIn .3s ease both',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'none' } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
    },
  },
  plugins: [],
};
