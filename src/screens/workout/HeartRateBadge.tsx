/** Live bpm from the heart-rate sensor, colored by zone. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { withAlpha } from '../../theme/colors';
import { numeric } from '../../theme/typography';
import { Icon } from '../../ui/Icon';
import { T } from '../../ui/Text';
import { useHr } from '../../hr/hrRuntime';
import { hrZone, maxHeartRate } from '../../hr/heartRate';
import { ageFrom } from '../../core/dates';

export function HeartRateBadge() {
  const { c } = useTheme();
  const saved = useStore(s => !!s.settings.hr.deviceId);
  const birth = useStore(s => s.profile.birthDate);
  const status = useHr(s => s.status);
  const bpm = useHr(s => s.bpm);
  if (!saved || status === 'off') return null;
  const live = status === 'live' && bpm != null;
  const zone = live ? hrZone(bpm, maxHeartRate(ageFrom(birth))) : 0;
  const color = !live
    ? c.tertiary
    : [c.secondary, c.accent, c.green, c.yellow, c.orange, c.red][zone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: withAlpha(live ? color : c.label, 0.12) },
      ]}
      accessibilityLabel={
        live ? `Battito ${bpm}` : 'Sensore cardio non collegato'
      }
    >
      <Icon name="heart" size={14} color={color} weight={2.4} />
      <T style={[numeric(15), { color: live ? c.label : c.tertiary }]}>
        {live ? bpm : '--'}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
});
