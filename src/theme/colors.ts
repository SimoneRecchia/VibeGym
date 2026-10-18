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
  // Glass fallback (Android / iOS < 26): without a system blur it is opaque,
  // any transparency lets the content behind show through as clutter.
  glass: '#FAFAFC',
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
  glass: '#242428',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.14)',
  shadow: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.5)',
  onAccent: '#FFFFFF',
};

export type Palette = typeof light & {
  accent: string;
  accentSoft: string;
  /** Companion hues of the accent (backdrop glow, day colors). */
  accent2: string;
  accent3: string;
};

/**
 * The theme color tints the whole app, so it feels alive instead of flat
 * grey on black: backgrounds and surfaces take a little of the accent, and
 * two companion hues glow behind the content (see Backdrop).
 */
export const buildPalette = (isDark: boolean, accent: AccentName): Palette => {
  const base = isDark ? dark : light;
  const a = ACCENTS[accent][isDark ? 'dark' : 'light'];
  const tint = isDark
    ? {
        bg: mix('#06070B', a, 0.07),
        card: mix('#16171C', a, 0.09),
        cardElevated: mix('#22232A', a, 0.11),
        inset: mix('#1E1F25', a, 0.09),
        glass: mix('#1E1F26', a, 0.12),
      }
    : {
        bg: mix('#F2F2F7', a, 0.06),
        card: '#FFFFFF',
        cardElevated: '#FFFFFF',
        inset: mix('#F2F2F7', a, 0.06),
        glass: mix('#FFFFFF', a, 0.03),
      };
  return {
    ...base,
    ...tint,
    accent: a,
    accentSoft: withAlpha(a, isDark ? 0.24 : 0.14),
    accent2: rotateHue(a, 55),
    accent3: rotateHue(a, -65),
  };
};

/** Vivid colors for the days of a plan, the first one is the accent. */
const DAY_HUES = [
  '#FF9230',
  '#30D158',
  '#DB34F2',
  '#FF375F',
  '#3CD3FE',
  '#FFC300',
  '#6D7CFF',
];

export const dayColor = (index: number, c: Pick<Palette, 'accent'>): string => {
  if (index <= 0) return c.accent;
  // Skip the hues too close to the accent, so days stay distinguishable.
  const h = hue(c.accent);
  const others = DAY_HUES.filter(x => {
    const d = Math.abs(hue(x) - h);
    return Math.min(d, 360 - d) > 28;
  });
  return others[(index - 1) % others.length];
};

const toRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map(v =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** Linear blend of two hex colors (t = share of b). */
export const mix = (a: string, b: string, t: number): string => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex(
    x[0] + (y[0] - x[0]) * t,
    x[1] + (y[1] - x[1]) * t,
    x[2] + (y[2] - x[2]) * t,
  );
};

const toHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = toRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
      ? (b - r) / d + 2
      : (r - g) / d + 4;
  return [h * 60, s, l];
};

const hue = (hex: string) => toHsl(hex)[0];

const rotateHue = (hex: string, deg: number): string => {
  const [h0, s, l] = toHsl(hex);
  const h = (((h0 + deg) % 360) + 360) % 360;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
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
