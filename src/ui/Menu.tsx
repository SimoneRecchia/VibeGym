/**
 * Contextual menu: the native action sheet on iOS, a glass sheet on Android.
 */
import React from 'react';
import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { Sheet } from './Sheet';
import { Row, Section } from './List';
import { IconName } from './Icon';
import { T } from './Text';

export interface MenuOption {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

interface MenuState {
  title?: string;
  message?: string;
  options: MenuOption[] | null;
}

const useMenu = create<MenuState>()(() => ({ options: null }));

export const showMenu = (opts: {
  title?: string;
  message?: string;
  options: MenuOption[];
}) => {
  if (Platform.OS === 'ios') {
    const labels = [...opts.options.map(o => o.label), 'Annulla'];
    const destructive = opts.options
      .map((o, i) => (o.destructive ? i : -1))
      .filter(i => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: opts.title,
        message: opts.message,
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: destructive,
      },
      i => {
        if (i < opts.options.length) opts.options[i].onPress();
      },
    );
    return;
  }
  useMenu.setState({
    title: opts.title,
    message: opts.message,
    options: opts.options,
  });
};

export function MenuHost() {
  const { title, message, options } = useMenu();
  const close = () => useMenu.setState({ options: null });
  return (
    <Sheet visible={!!options} onClose={close} title={title}>
      {message ? (
        <T v="footnote" color="secondary" align="center" style={styles.message}>
          {message}
        </T>
      ) : null}
      <View>
        <Section>
          {(options ?? []).map(o => (
            <Row
              key={o.label}
              title={o.label}
              destructive={o.destructive}
              onPress={() => {
                close();
                setTimeout(o.onPress, 250);
              }}
            />
          ))}
        </Section>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  message: { marginBottom: 12 },
});
