/**
 * SF Pro text styles (iOS Dynamic Type, "Large" size). On Android the system
 * font (Roboto / Google Sans) takes the same metrics.
 */
import { Platform, TextStyle } from 'react-native';

const family = Platform.select({ android: 'sans-serif', default: undefined });
const familyMedium = Platform.select({
  android: 'sans-serif-medium',
  default: undefined,
});
const rounded = Platform.select({ ios: 'ui-rounded', default: familyMedium });

const t = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TextStyle['fontWeight'],
  letterSpacing = 0,
  medium = false,
): TextStyle => ({
  fontFamily: medium ? familyMedium : family,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
});

export const type = {
  largeTitle: t(34, 41, '700', 0.4, true),
  title1: t(28, 34, '700', 0.38, true),
  title2: t(22, 28, '700', -0.26, true),
  title3: t(20, 25, '600', -0.45, true),
  headline: t(17, 22, '600', -0.43, true),
  body: t(17, 22, '400', -0.43),
  callout: t(16, 21, '400', -0.31),
  subhead: t(15, 20, '400', -0.23),
  subheadStrong: t(15, 20, '600', -0.23, true),
  footnote: t(13, 18, '400', -0.08),
  footnoteStrong: t(13, 18, '600', -0.08, true),
  caption: t(12, 16, '400', 0),
  captionStrong: t(12, 16, '600', 0, true),
  caption2: t(11, 13, '500', 0.06),
} as const;

export type TypeName = keyof typeof type;

/** Big rounded numerals for timers and stats (SF Pro Rounded on iOS). */
export const numeric = (
  fontSize: number,
  weight: TextStyle['fontWeight'] = '700',
): TextStyle => ({
  fontFamily: rounded,
  fontSize,
  lineHeight: Math.round(fontSize * 1.15),
  fontWeight: weight,
  fontVariant: ['tabular-nums'],
  letterSpacing: fontSize > 40 ? -1 : 0,
});
