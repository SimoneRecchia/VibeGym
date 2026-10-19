/* eslint-disable no-bitwise */
/**
 * Colors. Content sits on tonal surfaces; Liquid Glass is reserved for the
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

/*
 * Palette. Deep ink backgrounds (never pure black), tonal surfaces without
 * borders, and a few emotional colors with a gradient partner, as in the
 * Activity rings: energy (Move), done (Exercise), calm (Stand), gold.
 */
const light = {
  dark: false,
  // Backgrounds
  bg: '#F2F3F7',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  inset: '#ECEEF3',
  // Labels
  label: '#0B0D12',
  secondary: 'rgba(28,32,44,0.62)',
  tertiary: 'rgba(28,32,44,0.36)',
  quaternary: 'rgba(28,32,44,0.18)',
  // Fills
  fill: 'rgba(118,124,140,0.22)',
  fill2: 'rgba(118,124,140,0.17)',
  fill3: 'rgba(118,124,140,0.12)',
  fill4: 'rgba(118,124,140,0.07)',
  separator: 'rgba(28,32,44,0.09)',
  // Status
  green: '#28C24C',
  red: '#FF3B30',
  orange: '#FF8D28',
  yellow: '#F5C400',
  // Glass fallback (Android / iOS < 26): without a system blur it is opaque,
  // any transparency lets the content behind show through as clutter.
  glass: '#FFFFFF',
  glassBorder: 'rgba(0,0,0,0)',
  glassHighlight: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(20,24,40,0.14)',
  scrim: 'rgba(10,12,20,0.28)',
  onAccent: '#FFFFFF',
};

const dark: typeof light = {
  dark: true,
  bg: '#0A0C11',
  card: '#151821',
  cardElevated: '#1E222C',
  inset: '#10131A',
  label: '#F4F6FA',
  secondary: 'rgba(232,238,250,0.62)',
  tertiary: 'rgba(232,238,250,0.34)',
  quaternary: 'rgba(232,238,250,0.16)',
  fill: 'rgba(150,160,185,0.30)',
  fill2: 'rgba(150,160,185,0.23)',
  fill3: 'rgba(150,160,185,0.16)',
  fill4: 'rgba(150,160,185,0.10)',
  separator: 'rgba(255,255,255,0.07)',
  green: '#32D74B',
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  glass: '#1C2029',
  glassBorder: 'rgba(0,0,0,0)',
  glassHighlight: 'rgba(255,255,255,0.10)',
  shadow: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(0,0,0,0.55)',
  onAccent: '#FFFFFF',
};

type Grad = [string, string];

export type Palette = typeof light & {
  accent: string;
  accentSoft: string;
  /** Companion hues of the accent (backdrop glow, day colors). */
  accent2: string;
  accent3: string;
  /** The accent as a gradient (rings, hero, primary buttons). */
  accentGrad: Grad;
  /** Calories, effort. */
  energy: Grad;
  /** Completed sets, goals met. */
  done: Grad;
  /** Rest, recovery, sleep. */
  calm: Grad;
  /** Records, streaks. */
  gold: Grad;
};

const SEMANTIC = {
  dark: {
    energy: ['#FF375F', '#FF8A3D'] as Grad,
    done: ['#30D158', '#A3F03C'] as Grad,
    calm: ['#40C8FF', '#2F7BFF'] as Grad,
    gold: ['#FFD60A', '#FF9F0A'] as Grad,
  },
  light: {
    energy: ['#FF2D55', '#FF7A2F'] as Grad,
    done: ['#28C24C', '#7FD62C'] as Grad,
    calm: ['#1FB5F0', '#1F6FFF'] as Grad,
    gold: ['#F5C400', '#FF9500'] as Grad,
  },
};

/**
 * The theme color gives the whole app its mood: backgrounds and surfaces
 * take a hint of it, and it glows softly at the top of each screen.
 */
export const buildPalette = (isDark: boolean, accent: AccentName): Palette => {
  const base = isDark ? dark : light;
  const a = ACCENTS[accent][isDark ? 'dark' : 'light'];
  const tint = isDark
    ? {
        bg: mix('#0A0C11', a, 0.05),
        card: mix('#151821', a, 0.06),
        cardElevated: mix('#1E222C', a, 0.07),
        inset: mix('#10131A', a, 0.05),
        glass: mix('#1C2029', a, 0.08),
      }
    : {
        bg: mix('#F2F3F7', a, 0.04),
        card: '#FFFFFF',
        cardElevated: '#FFFFFF',
        inset: mix('#ECEEF3', a, 0.04),
        glass: '#FFFFFF',
      };
  return {
    ...base,
    ...tint,
    accent: a,
    accentSoft: withAlpha(a, isDark ? 0.22 : 0.12),
    accent2: rotateHue(a, 55),
    accent3: rotateHue(a, -65),
    accentGrad: [a, rotateHue(a, 32)],
    ...SEMANTIC[isDark ? 'dark' : 'light'],
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
