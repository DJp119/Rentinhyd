import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark Hyderabad Palette
        background: '#0D0D0D',      // Warm charcoal base
        backgroundElevated: '#141414', // Card/panel background
        backgroundHover: '#1A1A1A',    // Hover state
        border: '#2E2E2E',             // Subtle borders

        textPrimary: '#F5F5F0',        // Warm off-white primary
        textSecondary: '#B8B8B0',      // Muted secondary
        textMuted: '#888880',          // Disabled/tertiary

        accent: '#E8A838',             // Warm gold primary brand
        accentHover: '#D49828',        // Gold hover
        accentSoft: 'rgba(232, 168, 56, 0.15)', // Gold 15% opacity

        success: '#4CAF50',            // Green for rent pins
        successSoft: 'rgba(76, 175, 80, 0.15)',

        warning: '#FFB300',            // Amber for warnings
        warningSoft: 'rgba(255, 179, 0, 0.15)',

        error: '#EF5350',              // Red for errors/danger
        errorSoft: 'rgba(239, 83, 80, 0.15)',

        info: '#4FC3F7',               // Blue for flatmates
        infoSoft: 'rgba(79, 195, 247, 0.15)',

        overlay: 'rgba(13, 13, 13, 0.8)', // Modal backdrop
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        'xl': '1rem',      // 16px - cards
        '2xl': '1.25rem',  // 20px - modals
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'modal': '0 8px 48px rgba(0, 0, 0, 0.4)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.25)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        'prose': '65ch',
      },
    },
  },
  plugins: [],
};

export default config;