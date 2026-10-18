import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { monotonePath } from './scale';

/** Tiny trend line: history in a de-emphasis tone, the latest point in the accent. */
export function Sparkline({
  points,
  width = 72,
  height = 28,
}: {
  points: { t: number; v: number }[];
  width?: number;
  height?: number;
}) {
  const { c } = useTheme();
  if (points.length < 2) return null;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const vMin = Math.min(...points.map(p => p.v));
  const vMax = Math.max(...points.map(p => p.v));
  const pad = 4;
  const pts = points.map(p => ({
    x: pad + ((p.t - tMin) / (tMax - tMin || 1)) * (width - pad * 2),
    y: pad + (1 - (p.v - vMin) / (vMax - vMin || 1)) * (height - pad * 2),
  }));
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path
        d={monotonePath(pts)}
        stroke={c.tertiary}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Circle
        cx={last.x}
        cy={last.y}
        r={3.5}
        fill={c.accent}
        stroke={c.card}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
