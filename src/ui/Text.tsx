import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { type, TypeName } from '../theme/typography';
import { Palette } from '../theme/colors';

export type ColorRole =
  | 'label'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'red'
  | 'green'
  | 'orange'
  | 'onAccent';

interface Props extends TextProps {
  v?: TypeName;
  color?: ColorRole | (string & {});
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

const ROLES: ColorRole[] = [
  'label',
  'secondary',
  'tertiary',
  'accent',
  'red',
  'green',
  'orange',
  'onAccent',
];

export const resolveColor = (c: Palette, color: string): string =>
  (ROLES as string[]).includes(color)
    ? (c[color as keyof Palette] as string)
    : color;

export function T({
  v = 'body',
  color = 'label',
  align,
  weight,
  style,
  ...rest
}: Props) {
  const { c } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        type[v],
        { color: resolveColor(c, color) },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}
