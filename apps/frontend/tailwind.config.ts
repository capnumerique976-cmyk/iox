import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Couleurs métier IOX (statuts)
        status: {
          compliant: '#16a34a',
          reserved: '#d97706',
          blocked: '#dc2626',
          draft: '#6b7280',
          available: '#2563eb',
        },
        // IOX Brand — B2B Platform design (Figma legacy)
        iox: {
          'tech-blue': 'var(--iox-tech-blue)',
          'tech-blue-dark': 'var(--iox-tech-blue-dark)',
          'ocean-teal': 'var(--iox-ocean-teal)',
          'vanilla-gold': 'var(--iox-vanilla-gold)',
          'earth-green': 'var(--iox-earth-green)',
          primary: 'var(--iox-primary)',
          accent: 'var(--iox-accent)',
        },
        // IOX Premium (Figma Make — DS-0)
        // Usage: bg-premium-primary, text-premium-accent, ring-premium-success…
        premium: {
          primary: 'var(--iox-premium-primary)',
          'primary-light': 'var(--iox-premium-primary-light)',
          accent: 'var(--iox-premium-accent)',
          'accent-light': 'var(--iox-premium-accent-light)',
          success: 'var(--iox-premium-success)',
          'success-light': 'var(--iox-premium-success-light)',
          warning: 'var(--iox-premium-warning)',
          'warning-light': 'var(--iox-premium-warning-light)',
          danger: 'var(--iox-premium-danger)',
          'neutral-50': 'var(--iox-premium-neutral-50)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'var(--radius-xl)', // 16px
        '2xl': 'var(--radius-2xl)', // 20px
      },
      boxShadow: {
        // Élévation premium (shadow navy-tinted, Figma)
        'premium-sm': 'var(--shadow-premium-sm)',
        'premium-md': 'var(--shadow-premium-md)',
        'premium-lg': 'var(--shadow-premium-lg)',
        'premium-xl': 'var(--shadow-premium-xl)',
        'glow-accent': 'var(--shadow-premium-glow-accent)',
        'glow-primary': 'var(--shadow-premium-glow-primary)',
      },
      backgroundImage: {
        // Gradients premium
        'gradient-iox-primary': 'var(--gradient-iox-primary)',
        'gradient-iox-accent': 'var(--gradient-iox-accent)',
        'gradient-iox-success': 'var(--gradient-iox-success)',
        'gradient-iox-warning': 'var(--gradient-iox-warning)',
        'gradient-iox-glass': 'var(--gradient-iox-glass)',
        'gradient-iox-overlay': 'var(--gradient-iox-overlay)',
      },
      backdropBlur: {
        glass: '12px',
      },
      keyframes: {
        'iox-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'iox-shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'iox-pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(45, 156, 219, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(45, 156, 219, 0.6)' },
        },
        'iox-scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'iox-slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'iox-status-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'iox-spin-glow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'iox-float 3s ease-in-out infinite',
        shimmer: 'iox-shimmer 2s infinite linear',
        'pulse-glow': 'iox-pulse-glow 2s ease-in-out infinite',
        'scale-in': 'iox-scale-in 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'iox-slide-up 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        'status-pulse': 'iox-status-pulse 2s ease-in-out infinite',
        'spin-glow': 'iox-spin-glow 1s linear infinite',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '200ms',
        base: '300ms',
        slow: '500ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
