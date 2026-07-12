import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'x'
  | 'check'
  | 'sun'
  | 'moon'
  | 'dots'
  | 'pencil'
  | 'download'
  | 'upload'
  | 'trash'
  | 'doc'
  | 'chart'
  | 'dumbbell'
  | 'timer'
  | 'bulb'
  | 'copy'
  | 'lightning'
  | 'list'
  | 'trophy'
  | 'plus'
  | 'minus'
  | 'repeat'
  | 'target'
  | 'refresh'
  | 'layers'
  | 'gear'
  | 'share'
  | 'play'
  | 'pause'
  | 'stop'
  | 'flame'
  | 'sparkles'
  | 'cloud'
  | 'phone';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const stroke = (sw: number) => ({
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function Icon({ name, size = 22, color = '#FAFAFA', strokeWidth = 1.75 }: Props) {
  const s = stroke(strokeWidth);
  switch (name) {
    case 'arrow-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M19 12H5" stroke={color} {...s} />
          <Path d="M12 19l-7-7 7-7" stroke={color} {...s} />
        </Svg>
      );
    case 'arrow-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12h14" stroke={color} {...s} />
          <Path d="M12 5l7 7-7 7" stroke={color} {...s} />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={color} {...s} strokeWidth={2} />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9l6 6 6-6" stroke={color} {...s} strokeWidth={2} />
        </Svg>
      );
    case 'chevron-up':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 15l6-6 6 6" stroke={color} {...s} strokeWidth={2} />
        </Svg>
      );
    case 'x':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M18 6L6 18" stroke={color} {...s} strokeWidth={2} />
          <Path d="M6 6l12 12" stroke={color} {...s} strokeWidth={2} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 13l4 4L19 7" stroke={color} {...s} strokeWidth={2.6} />
        </Svg>
      );
    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4" stroke={color} {...s} />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke={color} {...s} />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} {...s} />
        </Svg>
      );
    case 'dots':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Circle cx="5" cy="12" r="1.7" />
          <Circle cx="12" cy="12" r="1.7" />
          <Circle cx="19" cy="12" r="1.7" />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 20h9" stroke={color} {...s} />
          <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke={color} {...s} />
        </Svg>
      );
    case 'download':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} {...s} />
          <Path d="M7 10l5 5 5-5" stroke={color} {...s} />
          <Path d="M12 15V3" stroke={color} {...s} />
        </Svg>
      );
    case 'upload':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} {...s} />
          <Path d="M17 8l-5-5-5 5" stroke={color} {...s} />
          <Path d="M12 3v12" stroke={color} {...s} />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 6h18" stroke={color} {...s} />
          <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} {...s} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke={color} {...s} />
          <Path d="M10 11v6" stroke={color} {...s} />
          <Path d="M14 11v6" stroke={color} {...s} />
        </Svg>
      );
    case 'doc':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} {...s} />
          <Path d="M14 2v6h6" stroke={color} {...s} />
          <Path d="M16 13H8M16 17H8M10 9H8" stroke={color} {...s} />
        </Svg>
      );
    case 'chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 21h18" stroke={color} {...s} />
          <Path d="M6 17V9M12 17V5M18 17v-4" stroke={color} {...s} />
        </Svg>
      );
    case 'dumbbell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6.5 6.5 17.5 17.5" stroke={color} {...s} />
          <Path d="M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7" stroke={color} {...s} />
        </Svg>
      );
    case 'timer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="13" r="8" stroke={color} {...s} />
          <Path d="M12 9v4l2 2" stroke={color} {...s} />
          <Path d="M5 3L2 6M22 6l-3-3M9 1h6" stroke={color} {...s} />
        </Svg>
      );
    case 'bulb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 18h6M10 22h4" stroke={color} {...s} />
          <Path d="M12 2a7 7 0 0 0-4 12.73V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.27A7 7 0 0 0 12 2z" stroke={color} {...s} />
        </Svg>
      );
    case 'copy':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="9" y="9" width="13" height="13" rx="2.5" stroke={color} {...s} />
          <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} {...s} />
        </Svg>
      );
    case 'lightning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} {...s} fill={color} />
        </Svg>
      );
    case 'list':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M8 6h13M8 12h13M8 18h13" stroke={color} {...s} />
          <Circle cx="3.5" cy="6" r="1" fill={color} />
          <Circle cx="3.5" cy="12" r="1" fill={color} />
          <Circle cx="3.5" cy="18" r="1" fill={color} />
        </Svg>
      );
    case 'trophy':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" stroke={color} {...s} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke={color} {...s} strokeWidth={2} />
        </Svg>
      );
    case 'minus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12h14" stroke={color} {...s} strokeWidth={2} />
        </Svg>
      );
    case 'repeat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M17 2l4 4-4 4" stroke={color} {...s} />
          <Path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} {...s} />
          <Path d="M7 22l-4-4 4-4" stroke={color} {...s} />
          <Path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} {...s} />
        </Svg>
      );
    case 'target':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} {...s} />
          <Circle cx="12" cy="12" r="3.5" stroke={color} {...s} />
          <Circle cx="12" cy="12" r="0.8" fill={color} />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M1 4v6h6M23 20v-6h-6" stroke={color} {...s} />
          <Path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M3.51 15A9 9 0 0 0 18.36 18.36L23 14" stroke={color} {...s} />
        </Svg>
      );
    case 'layers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2l10 5-10 5L2 7l10-5z" stroke={color} {...s} />
          <Path d="M2 17l10 5 10-5" stroke={color} {...s} />
          <Path d="M2 12l10 5 10-5" stroke={color} {...s} />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} {...s} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke={color}
            {...s}
          />
        </Svg>
      );
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" stroke={color} {...s} />
          <Path d="M16 6l-4-4-4 4" stroke={color} {...s} />
          <Path d="M12 2v13" stroke={color} {...s} />
        </Svg>
      );
    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Path d="M7 4.5v15l13-7.5L7 4.5z" stroke={color} {...s} />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Rect x="6" y="4.5" width="4" height="15" rx="1.5" />
          <Rect x="14" y="4.5" width="4" height="15" rx="1.5" />
        </Svg>
      );
    case 'stop':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Rect x="5" y="5" width="14" height="14" rx="3" />
        </Svg>
      );
    case 'flame':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 2.5-1 2.5-2.5 0-1.7-2-2-2-4 0-2 2-3 2-3s-2 7 1 7 3-4 3-4-1 9-6 9-6-3-6-5c0-1.5 1-2.5 1-2.5"
            stroke={color}
            {...s}
          />
          <Path d="M14 2c0 4-3 3-3 6 0 2 2 2 2 4" stroke={color} {...s} />
        </Svg>
      );
    case 'sparkles':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" stroke={color} {...s} />
          <Path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14zM4 4l.6 1.7L6.3 6.3 4.6 6.9 4 8.6 3.4 6.9 1.7 6.3l1.7-.6L4 4z" stroke={color} {...s} />
        </Svg>
      );
    case 'cloud':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6.5 19h11z" stroke={color} {...s} />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="6" y="2" width="12" height="20" rx="2.5" stroke={color} {...s} />
          <Path d="M11 18h2" stroke={color} {...s} />
        </Svg>
      );
    default:
      return null;
  }
}
