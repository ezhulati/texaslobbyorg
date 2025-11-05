/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Texas Flag Blue (#00205B) - Official Texas Flag Blue
        'texas-blue': {
          50: '#e6eaf2',
          100: '#ccd5e5',
          200: '#99abcb',
          300: '#6681b1',
          400: '#335797',
          500: '#00205B', // Official Texas Flag Blue
          600: '#001a4c',
          700: '#00143d',
          800: '#000d2e',
          900: '#00071f',
        },
        // Texas Flag Red (#BF0D3E) - Official Texas Flag Red
        'texas-red': {
          50: '#fce8ed',
          100: '#f9d1db',
          200: '#f3a3b7',
          300: '#ed7593',
          400: '#e7476f',
          500: '#BF0D3E', // Official Texas Flag Red
          600: '#990a32',
          700: '#730825',
          800: '#4d0519',
          900: '#26030c',
        },
        // Complementary Texas Colors
        'texas-gold': {
          50: '#fef9e7',
          100: '#fdf3cf',
          200: '#fbe79f',
          300: '#f9db6f',
          400: '#f7cf3f',
          500: '#d4a017', // Texas Gold
          600: '#aa8013',
          700: '#7f600e',
          800: '#55400a',
          900: '#2a2005',
        },
        'lone-star': {
          50: '#f5f5f5',
          100: '#e8e8e8',
          200: '#d1d1d1',
          300: '#bababa',
          400: '#a3a3a3',
          500: '#6b7280', // Neutral gray for the lone star
          600: '#565b66',
          700: '#40444d',
          800: '#2b2e33',
          900: '#15171a',
        },
        // Semantic colors using Texas palette
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Legacy colors for backward compatibility (will update usage gradually)
        'austin-sage': '#8b9474',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        heading: [
          'Playfair Display',
          'Georgia',
          'serif',
        ],
      },
      boxShadow: {
        'texas': '0 4px 6px -1px rgba(0, 32, 91, 0.1), 0 2px 4px -1px rgba(0, 32, 91, 0.06)',
        'texas-md': '0 10px 15px -3px rgba(0, 32, 91, 0.1), 0 4px 6px -2px rgba(0, 32, 91, 0.05)',
        'texas-lg': '0 20px 25px -5px rgba(0, 32, 91, 0.1), 0 10px 10px -5px rgba(0, 32, 91, 0.04)',
      },
    },
  },
  plugins: [],
};
