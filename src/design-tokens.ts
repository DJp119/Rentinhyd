// design-tokens.ts
// Hyderabad Rent - Dark, practical visual system for Hyderabad
// Not copied from Bengaluru - distinct identity

export const colors = {
  // Base - warm dark charcoal, not pure black
  background: '#0D0D0D',
  backgroundElevated: '#141414',
  backgroundHover: '#1A1A1A',
  surface: '#1A1A1A',
  surfaceElevated: '#222222',
  surfaceHover: '#2A2A2A',

  // Borders - subtle, warm
  border: '#2E2E2E',
  borderHover: '#3A3A3A',
  borderFocus: '#E8A838', // Hyderabad gold accent

  // Text - warm off-white hierarchy
  textPrimary: '#F5F5F0',
  textSecondary: '#B8B8B0',
  textMuted: '#888880',
  textInverse: '#0D0D0D',
  textLink: '#E8A838',
  textLinkHover: '#F0C050',

  // Accent - Hyderabad gold (heritage, warmth)
  accent: '#E8A838',
  accentHover: '#F0C050',
  accentMuted: '#3D3518',
  accentSoft: 'rgba(232, 168, 56, 0.12)',

  // Semantic - functional colors
  success: '#4CAF50',
  successSoft: 'rgba(76, 175, 80, 0.15)',
  warning: '#FFB300',
  warningSoft: 'rgba(255, 179, 0, 0.15)',
  error: '#EF5350',
  errorSoft: 'rgba(239, 83, 80, 0.15)',
  info: '#29B6F6',
  infoSoft: 'rgba(41, 182, 246, 0.15)',

  // Listing type indicators
  wholeFlat: '#E8A838',   // Gold
  roomFlatmate: '#4FC3F7', // Sky blue

  // Map pin colors (rent bands)
  pinLow: '#4CAF50',       // <15k
  pinLowMid: '#8BC34A',    // 15-25k
  pinMid: '#FFB300',       // 25-40k
  pinMidHigh: '#FF9800',   // 40-60k
  pinHigh: '#EF5350',      // 60k+

  // Overlay
  overlay: 'rgba(13, 13, 13, 0.85)',
  scrim: 'rgba(13, 13, 13, 0.6)',

  // Focus ring
  focusRing: '#E8A838',
} as const;

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const typography = {
  fontFamily: {
    sans: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"IBM Plex Mono", "SF Mono", "Fira Code", monospace',
    display: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.02em' }],
    sm: ['14px', { lineHeight: '20px', letterSpacing: '0.01em' }],
    base: ['16px', { lineHeight: '24px', letterSpacing: '0' }],
    lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
    xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
    '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
    '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
    '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.03em' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.1',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  focus: '0 0 0 3px rgba(232, 168, 56, 0.4)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
} as const;

export const transitions = {
  fast: '150ms ease-out',
  normal: '200ms ease-out',
  slow: '300ms ease-out',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  map: 0,
  propertyMarker: 10,
  toLetMarker: 12,
  submittedRentPin: 15,
  userLocation: 20,
  mapControls: 30,
  mapNavigation: 40,
  mapNotification: 50,
  modalBackdrop: 60,
  modal: 70,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  popover: 600,
  tooltip: 700,
  toast: 800,
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      sm: '0 12px',
      md: '0 16px',
      lg: '0 24px',
    },
    fontSize: {
      sm: '13px',
      md: '14px',
      lg: '16px',
    },
  },
  input: {
    height: '44px',
    padding: '0 12px',
    fontSize: '16px', // Prevents zoom on iOS
    borderWidth: '1px',
  },
  card: {
    padding: '20px',
    gap: '16px',
  },
  bottomSheet: {
    maxHeight: '85vh',
    borderRadius: '16px 16px 0 0',
    handleSize: '36px x 4px',
  },
  map: {
    pinSize: {
      cluster: '40px',
      individual: '28px',
    },
  },
} as const;

// Utility type for theme
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof borderRadius;
export type ShadowToken = keyof typeof shadows;