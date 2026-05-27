import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { View } from 'react-native';

interface Props {
  values: number[];
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  showPoints?: boolean;
}

/**
 * Small inline line chart. Smoothing kept minimal (straight segments) so
 * progressions stay readable at small sizes.
 */
export function Sparkline({
  values,
  width,
  height,
  color,
  fillColor,
  showPoints = true,
}: Props) {
  if (values.length === 0) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padY = 4;
  const drawH = height - padY * 2;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => ({
    x: i * stepX,
    y: padY + drawH - ((v - min) / range) * drawH,
  }));

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`))
    .join(' ');

  const fillPath = fillColor
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)} ${height} L${points[0].x.toFixed(1)} ${height} Z`
    : null;

  return (
    <Svg width={width} height={height}>
      {fillPath && <Path d={fillPath} fill={fillColor} />}
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showPoints &&
        points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 3.5 : 2.2}
            fill={color}
          />
        ))}
    </Svg>
  );
}
