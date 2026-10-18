/**
 * Line icons drawn on a 24pt grid in the style of SF Symbols (rounded caps,
 * regular weight). On iOS the native tab bar uses real SF Symbols.
 */
import React, { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'xmark'
  | 'plus'
  | 'minus'
  | 'check'
  | 'ellipsis'
  | 'gear'
  | 'person'
  | 'chart'
  | 'dumbbell'
  | 'figure'
  | 'run'
  | 'scale'
  | 'flame'
  | 'timer'
  | 'play'
  | 'pause'
  | 'forward'
  | 'refresh'
  | 'trash'
  | 'pencil'
  | 'share'
  | 'copy'
  | 'sparkles'
  | 'doc'
  | 'import'
  | 'bell'
  | 'bluetooth'
  | 'list'
  | 'trophy'
  | 'calendar'
  | 'info'
  | 'search'
  | 'external'
  | 'arrow-up-right'
  | 'arrow-down-right'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'bolt'
  | 'heart'
  | 'ruler'
  | 'drop'
  | 'swap'
  | 'star'
  | 'check-circle'
  | 'circle'
  | 'sun'
  | 'moon'
  | 'palette'
  | 'clock'
  | 'target'
  | 'clipboard'
  | 'camera'
  | 'layers'
  | 'reorder'
  | 'note'
  | 'bulb'
  | 'link';

/** Gear outline generated from geometry: 8 rounded teeth. */
const GEAR = (() => {
  const teeth = 8;
  const rOut = 9.6;
  const rIn = 7.4;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const seq: [number, number][] = [
      [a0 - step * 0.18, rOut],
      [a0 + step * 0.18, rOut],
      [a0 + step * 0.32, rIn],
      [a0 + step * 0.68, rIn],
    ];
    for (const [a, r] of seq)
      pts.push(
        `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(
          2,
        )}`,
      );
  }
  return `M${pts.join('L')}Z`;
})();

const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  const x1 = 12 + 6.8 * Math.cos(a);
  const y1 = 12 + 6.8 * Math.sin(a);
  const x2 = 12 + 9.2 * Math.cos(a);
  const y2 = 12 + 9.2 * Math.sin(a);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
}).join('');

type Shape = {
  d?: string;
  fill?: boolean;
  circles?: [number, number, number, boolean?][];
  rects?: [number, number, number, number, number][];
};

const SHAPES: Record<IconName, Shape> = {
  'chevron-left': { d: 'M15 18l-6-6 6-6' },
  'chevron-right': { d: 'M9 6l6 6-6 6' },
  'chevron-down': { d: 'M6 9l6 6 6-6' },
  'chevron-up': { d: 'M6 15l6-6 6 6' },
  xmark: { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' },
  plus: { d: 'M12 5v14M5 12h14' },
  minus: { d: 'M5 12h14' },
  check: { d: 'M5 12.5l4.5 4.5L19 7.5' },
  ellipsis: {
    circles: [
      [6, 12, 1.7, true],
      [12, 12, 1.7, true],
      [18, 12, 1.7, true],
    ],
  },
  gear: { d: GEAR, circles: [[12, 12, 3]] },
  person: {
    d: 'M5 20.5c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2',
    circles: [[12, 8, 3.6]],
  },
  chart: { d: 'M3.5 17.5l5.5-5.5 4 3.5 7.5-8.5M15.5 7h5v5' },
  dumbbell: {
    d: 'M8 12h8M2.5 10v4M21.5 10v4',
    rects: [
      [4.5, 7.5, 3.5, 9, 1.2],
      [16, 7.5, 3.5, 9, 1.2],
    ],
  },
  figure: {
    d: 'M12 7.5v6.5M7 10l5-1.8 5 1.8M12 14l-3.2 6.5M12 14l3.2 6.5',
    circles: [[12, 4.2, 2]],
  },
  run: {
    d: 'M13 7.5l-3 4.5 3.2 2.6-1.7 5.9M13 7.5l3.4 3.2 3.1-1.2M10 12l-3.8 1.2',
    circles: [[14.5, 4, 1.9]],
  },
  scale: {
    d: 'M9 10a4.2 4.2 0 0 1 6 0M12 10l1.4-1.8',
    rects: [[4, 4, 16, 16, 4.5]],
  },
  flame: {
    d: 'M12 3c.9 3.1 5.3 5.2 5.3 10.3a5.3 5.3 0 0 1-10.6 0c0-2.6 1.4-4.1 2.5-5.1.3 1.7 1.2 2.6 2.1 2.6-.5-2.6-.2-5.2.7-7.8z',
  },
  timer: {
    d: 'M12 13V9.3M10 2.8h4M18.4 6.6l1.4-1.4',
    circles: [[12, 13.3, 7.6]],
  },
  play: { d: 'M8 5.3v13.4L18.8 12z', fill: true },
  pause: {
    rects: [
      [6.5, 5, 3.6, 14, 1.2],
      [13.9, 5, 3.6, 14, 1.2],
    ],
    fill: true,
  },
  forward: { d: 'M4.5 6.2v11.6l7.2-5.8zM12.5 6.2v11.6l7.2-5.8z', fill: true },
  refresh: { d: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4' },
  trash: { d: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5' },
  pencil: { d: 'M4.5 19.5l1-4.2L16 4.8l3.2 3.2L8.7 18.5zM13.8 7l3.2 3.2' },
  share: { d: 'M12 3.5v11M8 7.5l4-4 4 4M8 10.5H6v10h12v-10h-2' },
  copy: {
    d: 'M15.5 8V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5H8',
    rects: [[8.5, 8.5, 11.5, 11.5, 2]],
  },
  sparkles: {
    d: 'M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9zM18.5 15l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z',
  },
  doc: { d: 'M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12.5h6M9 16h6' },
  import: { d: 'M12 3.5v10.5M8 10l4 4 4-4M4 14.5v5h16v-5' },
  bell: {
    d: 'M6 16.5v-5.3a6 6 0 0 1 12 0v5.3l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  },
  bluetooth: { d: 'M7 7.5l10 9-5 4.5V3l5 4.5-10 9' },
  list: {
    d: 'M9.5 6.5H20M9.5 12H20M9.5 17.5H20',
    circles: [
      [5, 6.5, 1.2, true],
      [5, 12, 1.2, true],
      [5, 17.5, 1.2, true],
    ],
  },
  trophy: {
    d: 'M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5v1a3 3 0 0 0 3 3M16.5 6h3v1a3 3 0 0 1-3 3M12 13.5V17M8.5 20h7M9.5 17h5v3',
  },
  calendar: { d: 'M4 10h16M8 3v4M16 3v4', rects: [[4, 5, 16, 15.5, 2.5]] },
  info: {
    d: 'M12 11v5.5',
    circles: [
      [12, 12, 9],
      [12, 7.8, 1.1, true],
    ],
  },
  search: { d: 'M15.8 15.8l4.7 4.7', circles: [[10.8, 10.8, 6.6]] },
  external: { d: 'M14 4h6v6M20 4l-8.5 8.5M18 14v5.5H4.5V6H10' },
  'arrow-up-right': { d: 'M7 17L17 7M9 7h8v8' },
  'arrow-down-right': { d: 'M7 7l10 10M17 9v8H9' },
  'arrow-right': { d: 'M5 12h14M13 6l6 6-6 6' },
  'arrow-up': { d: 'M12 19V5M6 11l6-6 6 6' },
  'arrow-down': { d: 'M12 5v14M6 13l6 6 6-6' },
  bolt: { d: 'M13.5 2.5L5.5 13.5h6l-1 8 8-11h-6z' },
  heart: {
    d: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z',
  },
  ruler: {
    d: 'M3.5 15.5l12-12 5 5-12 12zM7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2',
  },
  drop: { d: 'M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z' },
  swap: { d: 'M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5' },
  star: {
    d: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
  },
  'check-circle': { d: 'M8 12.3l2.8 2.8L16.2 9.5', circles: [[12, 12, 9]] },
  circle: { circles: [[12, 12, 9]] },
  sun: { d: SUN_RAYS, circles: [[12, 12, 4]] },
  moon: { d: 'M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z' },
  palette: {
    d: 'M12 3.5a8.5 8.5 0 0 0 0 17c1.1 0 1.7-.8 1.7-1.6 0-1.3-1-1.5-1-2.5 0-.9.7-1.5 1.5-1.5h2.3a4 4 0 0 0 4-4c0-4.3-3.8-7.4-8.5-7.4z',
    circles: [
      [7.8, 11.5, 1.2, true],
      [10, 7.6, 1.2, true],
      [14.5, 7.6, 1.2, true],
    ],
  },
  clock: { d: 'M12 7v5l3.2 2', circles: [[12, 12, 9]] },
  target: {
    circles: [
      [12, 12, 9],
      [12, 12, 5],
      [12, 12, 1.3, true],
    ],
  },
  clipboard: { d: 'M9 4.5H6.5v16h11v-16H15M9 3.5h6v2.5H9zM9.5 11h5M9.5 15h5' },
  camera: { d: 'M4 8h3l2-2.8h6L17 8h3v11.5H4z', circles: [[12, 13.5, 3.5]] },
  layers: { d: 'M12 4l9 5-9 5-9-5zM3 13.5l9 5 9-5' },
  reorder: { d: 'M5 8h14M5 12h14M5 16h14' },
  note: { d: 'M5 5h14v10.5H9.5L5 19.5zM8.5 9h7M8.5 12h4.5' },
  bulb: {
    d: 'M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.4 10.9V16h6.8v-2.1A6 6 0 0 0 12 3z',
  },
  link: {
    d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  },
};

interface Props {
  name: IconName;
  size?: number;
  color: string;
  weight?: number;
}

export const Icon = memo(function Icon({
  name,
  size = 22,
  color,
  weight = 1.9,
}: Props) {
  const s = SHAPES[name];
  const stroke = {
    stroke: color,
    strokeWidth: weight,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {s.d ? <Path d={s.d} {...(s.fill ? { fill: color } : stroke)} /> : null}
      {s.circles?.map(([cx, cy, r, filled], i) => (
        <Circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          {...(filled ? { fill: color } : stroke)}
        />
      ))}
      {s.rects?.map(([x, y, w, h, rr], i) => (
        <Rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={rr}
          {...(s.fill ? { fill: color } : stroke)}
        />
      ))}
    </Svg>
  );
});
