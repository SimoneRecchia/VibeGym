/**
 * Heading of a block in a screen: a title, an optional small line above it
 * and an action on the right. Title case, never all caps.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from './Text';

export function SectionHeader({
  title,
  overline,
  right,
  first,
}: {
  title: string;
  overline?: string;
  right?: React.ReactNode;
  /** No space above (first block of the screen). */
  first?: boolean;
}) {
  return (
    <View style={[styles.row, first && styles.first]}>
      <View style={styles.texts}>
        {overline ? (
          <T v="footnoteStrong" color="secondary" numberOfLines={1}>
            {overline}
          </T>
        ) : null}
        <T v="title3" numberOfLines={1}>
          {title}
        </T>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  first: { marginTop: 0 },
  texts: { flex: 1, minWidth: 0 },
});
