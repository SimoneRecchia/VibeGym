import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from './Backdrop';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  withBackdrop?: boolean;
}

/**
 * The base screen container. Provides the ambient backdrop and safe-area
 * padding, while letting children declare their own scroll behaviour.
 */
export function Screen({ children, style, withBackdrop = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }, style]}>
      {withBackdrop && <Backdrop />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
