/**
 * Visual tokens mirrored from ESP firmware theme.h
 * Primary #FF3D00, Accent #00AAFF, dark AMOLED look.
 */
export const theme = {
  colors: {
    primary: '#FF3D00',
    accent: '#00AAFF',
    secondary: '#AAAAAA',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    background: '#000000',
    neutral: '#666666',
    success: '#00AA00',
    error: '#FF0000',
    warning: '#CC8800',
    grinderActive: '#403800',
    surface: '#111111',
    surfaceElevated: '#1A1A1A',
    border: '#2A2A2A',
  },
  radii: {
    button: 20,
    card: 16,
  },
  sizes: {
    progressArc: 200,
  },
  fonts: {
    regular: 'system-ui, sans-serif',
    medium: 'system-ui, sans-serif',
    semiBold: 'system-ui, sans-serif',
    bold: 'system-ui, sans-serif',
  },
  typography: {
    weightDisplay: 56,
    title: 36,
    profile: 32,
    label: 24,
    body: 16,
    caption: 13,
  },
} as const;

export type Theme = typeof theme;
