/**
 * Full-color card for the one thing to do now (next workout, workout in
 * progress): a gradient of the given color with white content.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
  return (
    <View style={[styles.card, style]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={mix(color, '#FFFFFF', 0.12)} />
            <Stop offset="1" stopColor={mix(color, '#000000', 0.38)} />
          </LinearGradient>
        </Defs>
        {/* Rounded in the drawing too: on Android the clip of a view that
            changes size can lose its rounded corners. */}
        <Rect
          width="100%"
          height="100%"
          rx={radius.card}
          ry={radius.card}
          fill={`url(#${id})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** White pill button for use on a HeroCard. */
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
      feedback="light"
      accessibilityRole="button"
      accessibilityLabel={title}
      style={style}
    >
      <View style={styles.btn}>
        {icon ? <Icon name={icon} size={18} color={color} weight={2.4} /> : null}
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
    padding: 18,
  },
  btn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
