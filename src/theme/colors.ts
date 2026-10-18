/* eslint-disable no-bitwise */
/**
 * Apple system colors (iOS 26 HIG), light and dark variants.
 * Content sits on grouped backgrounds; Liquid Glass is reserved for the
 * navigation layer that floats above it (bars, buttons, sheets).
 */
import { AccentName } from '../core/types';

export const ACCENTS: Record<
  AccentName,
  { light: string; dark: string; label: string }
> = {
  blue: { light: '#0088FF', dark: '#0091FF', label: 'Blu' },
  indigo: { light: '#6155F5', dark: '#6D7CFF', label: 'Indaco' },
  purple: { light: '#CB30E0', dark: '#DB34F2', label: 'Viola' },
  pink: { light: '#FF2D55', dark: '#FF375F', label: 'Rosa' },
  red: { light: '#FF383C', dark: '#FF4245', label: 'Rosso' },
  orange: { light: '#FF8D28', dark: '#FF9230', label: 'Arancione' },
  green: { light: '#34C759', dark: '#30D158', label: 'Verde' },
  mint: { light: '#00C8B3', dark: '#00DAC3', label: 'Menta' },
  cyan: { light: '#00C0E8', dark: '#3CD3FE', label: 'Azzurro' },
};

export const ACCENT_ORDER: AccentName[] = [
  'blue',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'green',
  'mint',
  'cyan',
];

const light = {
  dark: false,
  // Backgrounds
  bg: '#F2F2F7', // systemGroupedBackground
  card: '#FFFFFF', // secondarySystemGroupedBackground
  cardElevated: '#FFFFFF',
  inset: '#F2F2F7', // tertiarySystemGroupedBackground
  // Labels
  label: '#000000',
  secondary: 'rgba(60,60,67,0.60)',
  tertiary: 'rgba(60,60,67,0.30)',
  quaternary: 'rgba(60,60,67,0.18)',
  // Fills
  fill: 'rgba(120,120,128,0.20)',
  fill2: 'rgba(120,120,128,0.16)',
  fill3: 'rgba(118,118,128,0.12)',
  fill4: 'rgba(116,116,128,0.08)',
  separator: 'rgba(60,60,67,0.18)',
  // Status
  green: '#34C759',
  red: '#FF383C',
  orange: '#FF8D28',
  yellow: '#FFCC00',
  // Glass fallback (Android / iOS < 26): translucent, no blur
  // Without a system blur (Android, iOS < 26) the glass must be nearly
  // opaque, or the content behind shows through as clutter.
  glass: 'rgba(250,250,252,0.97)',
  glassBorder: 'rgba(0,0,0,0.06)',
  glassHighlight: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(0,0,0,0.12)',
  scrim: 'rgba(0,0,0,0.25)',
  onAccent: '#FFFFFF',
};

const dark: typeof light = {
  dark: true,
  bg: '#000000',
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',
  inset: '#2C2C2E',
  label: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.60)',
  tertiary: 'rgba(235,235,245,0.30)',
  quaternary: 'rgba(235,235,245,0.16)',
  fill: 'rgba(120,120,128,0.36)',
  fill2: 'rgba(120,120,128,0.32)',
  fill3: 'rgba(118,118,128,0.24)',
  fill4: 'rgba(116,116,128,0.18)',
  separator: 'rgba(84,84,88,0.60)',
  green: '#30D158',
  red: '#FF4245',
  orange: '#FF9230',
  yellow: '#FFD600',
  glass: 'rgba(36,36,40,0.97)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.14)',
  shadow: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.5)',
  onAccent: '#FFFFFF',
};

export type Palette = typeof light & { accent: string; accentSoft: string };

export const buildPalette = (isDark: boolean, accent: AccentName): Palette => {
  const base = isDark ? dark : light;
  const a = ACCENTS[accent][isDark ? 'dark' : 'light'];
  return { ...base, accent: a, accentSoft: withAlpha(a, isDark ? 0.24 : 0.14) };
};

export const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const v =
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};
