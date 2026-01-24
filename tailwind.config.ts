import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        fabio: ['FabioXM', 'system-ui', 'sans-serif'],
        emoji: ['"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"', 'sans-serif'],
      },
      colors: {
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
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
          'card-bg': 'hsl(var(--sidebar-card-bg))',
          'card-border': 'hsl(var(--sidebar-card-border))',
          'compact-hover': 'hsl(var(--sidebar-compact-hover))',
        },
        badge: {
          live: 'hsl(var(--badge-live))',
          ended: 'hsl(var(--badge-ended))',
        },
        'live-hot': 'hsl(var(--live-hot))',
        'scheduled-badge': {
          bg: 'var(--scheduled-badge-bg)',
          border: 'var(--scheduled-badge-border)',
          text: 'var(--scheduled-badge-text)',
        },
        'featured-card-border': 'var(--featured-card-border)',
        'creator-green': 'var(--creator-green)',
        'gold-coin': 'var(--gold-coin)',
        'electric-lime': 'var(--electric-lime)',
        'bet-option': {
          bg: 'var(--bet-option-bg)',
          border: 'var(--bet-option-border)',
        },
        'card-grid': {
          bg: 'var(--card-grid-bg)',
          border: 'var(--card-grid-border)',
          'border-hover': 'var(--card-grid-border-hover)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'featured-card': 'var(--featured-card-radius)',
      },
      boxShadow: {
        'neon-glow': `0px 1px 0px 0px inset rgba(189,255,0,0.2), 0px -1px 0px 0px inset rgba(255,255,255,0.24), 0px -20px 50px 0px inset rgba(189,255,0,0.13), 0px -3px 30px 0px inset rgba(189,255,0,0.33), 0px 0px 60px 0px inset rgba(189,255,0,0.15)`,
        'input-glow': '0px 1px 0px 0px inset rgba(189,255,0,0.15), 0px -1px 0px 0px inset rgba(255,255,255,0.1), 0px -10px 30px 0px inset rgba(189,255,0,0.08)',
        'card-subtle': '0px 1px 0px 0px inset rgba(189,255,0,0.1), 0px -1px 0px 0px inset rgba(255,255,255,0.08), 0px 4px 12px 0px rgba(0,0,0,0.6)',
        'card-subtle-hover': '0px 1px 0px 0px inset rgba(189,255,0,0.15), 0px -1px 0px 0px inset rgba(255,255,255,0.12), 0px 6px 20px 0px rgba(189,255,0,0.12), 0px 2px 8px 0px rgba(0,0,0,0.7)',
        'tron-glow': '0 0 10px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.08)',
      },
      backgroundImage: {
        'featured-gradient': "linear-gradient(rgba(189, 255, 0, 0) 0%, rgba(189, 255, 0, 0.08) 100%), linear-gradient(90deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.85) 100%)",
        'card-grid-gradient': 'linear-gradient(180deg, rgba(189, 255, 0, 0) 0%, rgba(189, 255, 0, 0.05) 100%)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    animate,
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.tron-grid': {
          backgroundImage:
            'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        },
      });
    }),
  ],
} satisfies Config;
