import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { T } from './Text';

export function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon: IconName;
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
        <Icon name={icon} size={30} color={c.accent} />
      </View>
      <T v="title3" align="center">
        {title}
      </T>
      {text ? (
        <T v="subhead" color="secondary" align="center" style={styles.text}>
          {text}
        </T>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  text: { marginTop: 6, maxWidth: 320 },
  actions: { marginTop: 18, alignSelf: 'stretch', gap: 10 },
});
