// Match landing brand tokens. Values mirrored from
// /Users/nmil/Desktop/WeddingApp/styles/themes/wedding-theme.css
// (HSL converted to hex for Remotion's inline styles).
export const theme = {
  // Primary — dusty rose
  lpPrimary: '#D4AFB8',
  lpPrimaryDark: '#B68B96',
  lpPrimarySoft: '#EFDDE2',

  // Accent — warm gold/beige
  lpAccent: '#D7B784',
  lpAccentSoft: '#F1E4CB',

  // Backgrounds
  lpBg: '#FBF8F5',
  lpCard: '#FFFFFF',
  lpMuted: '#F0E5EA',

  // Text
  lpText: '#2E2127',
  lpMutedForeground: '#7A6872',
  lpBorder: '#E5D3DA',

  // Semantic
  lpSuccess: '#56AB6E',
  lpDestructive: '#E07979',
} as const;

export type ThemeKey = keyof typeof theme;
