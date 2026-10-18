import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Exercise } from '../../core/types';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { ExerciseThumb } from '../../ui/ExerciseMedia';
import { T } from '../../ui/Text';
import { Icon } from '../../ui/Icon';
import { Tap } from '../../ui/Pressable';
import { prescription } from '../../plan/planUtils';
import { fmtDuration } from '../../core/format';

interface Props {
  ex: Exercise;
  onPress?: () => void;
  right?: React.ReactNode;
  showRest?: boolean;
}

export function ExerciseRow({ ex, onPress, right, showRest = true }: Props) {
  const { c } = useTheme();
  const unit = useStore(s => s.settings.unit);
  const body = (
    <View style={styles.row}>
      <ExerciseThumb catalogId={ex.catalogId} kind={ex.kind} size={52} />
      <View style={styles.texts}>
        <T v="headline" numberOfLines={2}>
          {ex.name}
        </T>
        <T v="subhead" color="secondary" numberOfLines={1}>
          {prescription(ex, unit)}
        </T>
        {showRest && ex.restSec > 0 ? (
          <View style={styles.rest}>
            <Icon name="timer" size={13} color={c.tertiary} weight={2} />
            <T v="footnote" color="tertiary">
              Recupero {fmtDuration(ex.restSec)}
            </T>
          </View>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Icon
            name="chevron-right"
            size={16}
            color={c.tertiary}
            weight={2.4}
          />
        ) : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Tap
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={ex.name}
    >
      {body}
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  texts: { flex: 1, minWidth: 0, gap: 1 },
  rest: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
