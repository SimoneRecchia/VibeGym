import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { T } from './Text';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
}

/** Filled text field (iOS grouped style). */
export function TextField({ label, hint, style, multiline, ...rest }: Props) {
  const { c } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <T v="footnote" color="secondary" style={styles.label}>
          {label}
        </T>
      ) : null}
      <TextInput
        placeholderTextColor={c.tertiary}
        multiline={multiline}
        {...rest}
        style={[
          styles.input,
          { backgroundColor: c.card, color: c.label },
          multiline && styles.multi,
          style,
        ]}
      />
      {hint ? (
        <T v="footnote" color="secondary" style={styles.hint}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { marginLeft: 16, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
  },
  multi: { minHeight: 96, textAlignVertical: 'top' },
  hint: { marginHorizontal: 16, marginTop: 6 },
});
