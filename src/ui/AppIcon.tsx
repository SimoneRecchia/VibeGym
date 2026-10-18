/**
 * The home screen icon drawn in the app (picker, about): same shapes and
 * colors as the generated launcher icons (scripts/build-icon.js).
 */
import React from 'react';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import ICONS from './appIcons.json';

export const APP_ICONS = ICONS.colors;
export const DEFAULT_APP_ICON = ICONS.default;

export function AppIcon({ color, size }: { color: string; size: number }) {
  const icon = APP_ICONS.find(i => i.key === color) ?? APP_ICONS[0];
  const id = `appicon-${icon.key}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor={icon.bg[0]} />
          <Stop offset="1" stopColor={icon.bg[1]} />
        </LinearGradient>
      </Defs>
      <Rect width={100} height={100} rx={23} fill={`url(#${id})`} />
      <G transform={`translate(13 13) scale(0.74) ${ICONS.transform}`}>
        {ICONS.paths.map(p => (
          <Path key={p.d} d={p.d} fill="#FFFFFF" fillOpacity={p.alpha} />
        ))}
      </G>
    </Svg>
  );
}
