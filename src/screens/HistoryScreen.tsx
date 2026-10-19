import React, { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { T } from '../ui/Text';
import { IconButton } from '../ui/Button';
import { Empty } from '../ui/Empty';
import { Tap } from '../ui/Pressable';
import { Icon } from '../ui/Icon';
import {
  capitalize,
  fmtClock,
  fmtDateShort,
  fmtNum,
  plural,
} from '../core/format';
import { sessionSetsDone, sessionVolume } from '../stats/metrics';
import { ScreenProps } from '../navigation/types';
import { Session } from '../core/types';
import { GUTTER } from '../theme/metrics';

const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

/** All workouts, grouped by month (the table view of the activity charts). */
export function HistoryScreen({ navigation }: ScreenProps<'History'>) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sessions = useStore(s => s.sessions);

  const sections = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (let i = sessions.length - 1; i >= 0; i--) {
      const d = new Date(sessions[i].startedAt);
      const k = `${capitalize(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(sessions[i]);
    }
    return [...map.entries()].map(([title, data]) => ({ title, data }));
  }, [sessions]);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
        <IconButton
          icon="chevron-left"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Indietro"
        />
        <T v="headline">Storico</T>
        <View style={styles.side} />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={s => s.id}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: insets.bottom + 24,
        }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Empty
            icon="calendar"
            title="Ancora nessun allenamento"
            text="Gli allenamenti completati compariranno qui."
          />
        }
        renderSectionHeader={({ section }) => (
          <T v="title3" style={styles.month}>
            {section.title}
          </T>
        )}
        renderItem={({ item }) => (
          <Tap
            onPress={() => navigation.navigate('Session', { id: item.id })}
            scaleTo={0.98}
          >
            <View style={[styles.row, { backgroundColor: c.card }]}>
              <View style={[styles.date, { backgroundColor: c.accentSoft }]}>
                <T v="headline" color="accent">
                  {new Date(item.startedAt).getDate()}
                </T>
                <T v="caption2" color="accent">
                  {fmtDateShort(item.startedAt).split(' ')[1]}
                </T>
              </View>
              <View style={styles.flex}>
                <T v="headline" numberOfLines={1}>
                  {item.dayName}
                </T>
                <T v="footnote" color="secondary" numberOfLines={1}>
                  {fmtClock(item.durationSec)} ·{' '}
                  {plural(sessionSetsDone(item), 'serie', 'serie')}
                  {sessionVolume(item)
                    ? ` · ${fmtNum(sessionVolume(item) / 1000, 1)} t`
                    : ''}
                </T>
              </View>
              {item.records?.length ? (
                <Icon name="trophy" size={18} color={c.accent} />
              ) : null}
              <Icon
                name="chevron-right"
                size={16}
                color={c.tertiary}
                weight={2.4}
              />
            </View>
          </Tap>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
  },
  side: { width: 44 },
  month: { marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 22,
    marginBottom: 8,
  },
  date: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
});
