/**
 * Full-color card for the one thing to do now (next workout, workout in
 * progress): a deep gradient of the given color, a large faint ring in the
 * corner like the Activity rings, white content.
 */
import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { mix } from '../theme/colors';
import { radius } from '../theme/metrics';
import { Icon, IconName } from './Icon';
import { Tap } from './Pressable';
import { T } from './Text';

export function HeroCard({
  color,
  children,
  style,
}: {
  color: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const id = `hero${color.replace('#', '')}`;
  // Numeric size: on Android an SVG sized in % isn't redrawn when the card
  // grows, and the content spills out of the colored background.
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={[styles.card, style]}
      onLayout={e =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
    >
      <Svg
        width={size.w}
        height={size.h}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={mix(color, '#FFFFFF', 0.1)} />
            <Stop offset="0.55" stopColor={color} />
            <Stop offset="1" stopColor={mix(color, '#000000', 0.42)} />
          </LinearGradient>
        </Defs>
        {/* Rounded in the drawing too: on Android the clip of a view that
            changes size can lose its rounded corners. */}
        <Rect
          width={size.w}
          height={size.h}
          rx={radius.card}
          ry={radius.card}
          fill={`url(#${id})`}
        />
        <Circle
          cx={size.w}
          cy="0"
          r="110"
          stroke="#FFFFFF"
          strokeOpacity={0.1}
          strokeWidth={26}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}

/** White capsule button for use on a HeroCard. */
export function HeroButton({
  title,
  icon,
  color,
  onPress,
  disabled,
  style,
}: {
  title: string;
  icon?: IconName;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      feedback="medium"
      accessibilityRole="button"
      accessibilityLabel={title}
      style={style}
    >
      <View style={styles.btn}>
        {icon ? (
          <Icon name={icon} size={18} color={color} weight={2.4} />
        ) : null}
        <T v="headline" color={color}>
          {title}
        </T>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    padding: 22,
  },
  btn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
