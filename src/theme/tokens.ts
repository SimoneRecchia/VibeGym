/**
 * Design tokens for the Vibe Gym app.
 * Aesthetic: iOS 2026 "Liquid Glass" — depth through translucent surfaces,
 * continuous corner curves, soft inner highlights, restrained motion.
 */

export type Mode = 'dark' | 'light';

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

import { Platform } from 'react-native';

/**
 * System fonts: SF Pro on iOS (built-in: undefined fontFamily resolves to it),
 * Roboto on Android. We leave fontFamily undefined to use system defaults,
 * which automatically adapts to user accessibility (font scaling) and OS
 * theme on both platforms.
 */
const systemFont = Platform.select({
  ios: undefined,
  android: 'sans-serif',
  default: undefined,
});
const systemFontMedium = Platform.select({
  ios: undefined,
  android: 'sans-serif-medium',
  default: undefined,
});

export const typography = {
  largeTitle: { fontFamily: systemFontMedium, fontSize: 34, lineHeight: 41, fontWeight: '800' as const, letterSpacing: -0.7 },
  title1: { fontFamily: systemFontMedium, fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  title2: { fontFamily: systemFontMedium, fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.4 },
  title3: { fontFamily: systemFontMedium, fontSize: 20, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.3 },
  headline: { fontFamily: systemFontMedium, fontSize: 17, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontFamily: systemFont, fontSize: 17, lineHeight: 22, fontWeight: '500' as const },
  callout: { fontFamily: systemFont, fontSize: 16, lineHeight: 21, fontWeight: '500' as const },
  subhead: { fontFamily: systemFont, fontSize: 15, lineHeight: 20, fontWeight: '500' as const },
  footnote: { fontFamily: systemFont, fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: 0.1 },
  caption1: { fontFamily: systemFontMedium, fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption2: { fontFamily: systemFontMedium, fontSize: 11, lineHeight: 13, fontWeight: '700' as const, letterSpacing: 0.4 },
  mono: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const, fontVariant: ['tabular-nums' as const] },
};

const dark = {
  mode: 'dark' as Mode,

  bg: '#08080A',
  bgElevated: '#0F0F12',
  surface: 'rgba(255,255,255,0.06)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  surfaceSolid: '#17171B',
  surfaceSolid2: '#1F1F25',

  glassFill: 'rgba(255,255,255,0.05)',
  glassFillHover: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassBorderStrong: 'rgba(255,255,255,0.16)',
  glassShadow: 'rgba(0,0,0,0.55)',

  text: '#FAFAFA',
  textDim: '#B6B6BE',
  textFaint: '#6F6F78',

  accent: '#5E8BFF',
  accentSoft: 'rgba(94,139,255,0.18)',
  accentPress: '#3F71F5',

  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.16)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.18)',
  danger: '#FB7185',
  dangerSoft: 'rgba(251,113,133,0.18)',

  scrim: 'rgba(0,0,0,0.5)',
  divider: 'rgba(255,255,255,0.08)',
  dividerStrong: 'rgba(255,255,255,0.16)',
};

const light = {
  mode: 'light' as Mode,

  bg: '#F2F2F7',
  bgElevated: '#FFFFFF',
  surface: 'rgba(255,255,255,0.72)',
  surfaceStrong: 'rgba(255,255,255,0.86)',
  surfaceSolid: '#FFFFFF',
  surfaceSolid2: '#F5F5FA',

  glassFill: 'rgba(255,255,255,0.72)',
  glassFillHover: 'rgba(255,255,255,0.82)',
  glassHighlight: 'rgba(255,255,255,0.92)',
  glassBorder: 'rgba(15,15,30,0.08)',
  glassBorderStrong: 'rgba(15,15,30,0.14)',
  glassShadow: 'rgba(15,15,30,0.10)',

  text: '#0C0C12',
  textDim: '#4E4E58',
  textFaint: '#8E8E96',

  accent: '#3266FF',
  accentSoft: 'rgba(50,102,255,0.14)',
  accentPress: '#1E4CD9',

  success: '#13A871',
  successSoft: 'rgba(19,168,113,0.14)',
  warn: '#C77A07',
  warnSoft: 'rgba(199,122,7,0.16)',
  danger: '#DC2A4B',
  dangerSoft: 'rgba(220,42,75,0.14)',

  scrim: 'rgba(24,24,34,0.36)',
  divider: 'rgba(15,15,30,0.07)',
  dividerStrong: 'rgba(15,15,30,0.12)',
};

export type Palette = typeof dark;

export const palettes: Record<Mode, Palette> = { dark, light };

export const tonalAccent = (hex: string | undefined, fallback: string) => {
  if (!hex) return fallback;
  return hex;
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const m = hex.trim().replace('#', '');
  const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const n = parseInt(v, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};
