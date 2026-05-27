import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { hexToRgba } from '../theme/tokens';

interface Props {
  letter: string;
  name: string;
  meta: string;
  tint?: string;
  inProgress?: boolean;
  onPress: () => void;
}

export function DayRow({ letter, name, meta, tint, inProgress, onPress }: Props) {
  const { palette, mode } = useTheme();
  const accent = tint ?? palette.accent;
  const cardBg = mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)';

  return (
    <PressableScale onPress={onPress} style={{ marginBottom: 10 }}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: cardBg,
            borderColor: palette.glassBorder,
          },
        ]}
      >
        <View
          style={[
            styles.stub,
            {
              backgroundColor: hexToRgba(stripHashOrFallback(accent), 0.22),
              borderColor: hexToRgba(stripHashOrFallback(accent), 0.6),
            },
          ]}
        >
          <Text style={[styles.stubText, { color: accent }]}>{letter}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.headerLine}>
            <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
              {name}
            </Text>
            {inProgress && (
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: hexToRgba(stripHashOrFallback(accent), 0.18),
                    borderColor: hexToRgba(stripHashOrFallback(accent), 0.45),
                  },
                ]}
              >
                <Icon name="lightning" size={10} color={accent} />
                <Text style={[styles.tagText, { color: accent }]}>in corso</Text>
              </View>
            )}
          </View>
          <Text style={[styles.meta, { color: palette.textDim }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Icon name="chevron-right" color={palette.textFaint} size={20} />
      </View>
    </PressableScale>
  );
}

function stripHashOrFallback(hex: string): string {
  if (!hex) return '5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    gap: 12,
  },
  stub: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stubText: {
    ...typography.title3,
    fontWeight: '800',
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    ...typography.headline,
    flexShrink: 1,
  },
  meta: {
    ...typography.footnote,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  tagText: {
    ...typography.caption2,
    textTransform: 'uppercase',
  },
});
