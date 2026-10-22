/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        sunk: v('sunk'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        good: v('good'),
        'good-soft': v('good-soft'),
        warn: v('warn'),
        'warn-soft': v('warn-soft'),
        bad: v('bad'),
        'bad-soft': v('bad-soft'),
        fuel: v('fuel'),
        wear: v('wear'),
        fixed: v('fixed'),
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
