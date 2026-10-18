import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useDraft } from '../../data/draft';
import { T } from '../../ui/Text';
import { IconButton } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { Glass } from '../../ui/Glass';
import { Tap } from '../../ui/Pressable';
import { ExerciseThumb } from '../../ui/ExerciseMedia';
import {
  MUSCLE_FILTERS,
  displayName,
  equipmentLabel,
  muscleLabel,
  searchCatalog,
} from '../../catalog';
import { ScreenProps } from '../../navigation/types';
import { GUTTER } from '../../theme/metrics';

export function ExercisePickerScreen({
  route,
  navigation,
}: ScreenProps<'ExercisePicker'>) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string | null>(
    route.params.cardio ? 'cardio' : null,
  );

  const results = useMemo(() => {
    const f = MUSCLE_FILTERS.find(m => m.key === filter);
    return searchCatalog(q, {
      muscles: f?.muscles,
      cardio: filter === 'cardio',
      limit: 80,
    });
  }, [q, filter]);

  const pick = (catalogId: string | undefined, name: string) => {
    useDraft.getState().onPick?.({ catalogId, name });
    useDraft.setState({ onPick: null });
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
        <View style={styles.bar}>
          <IconButton
            icon="xmark"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Chiudi"
          />
          <T v="headline">{route.params.title ?? 'Scegli esercizio'}</T>
          <View style={styles.side} />
        </View>
        <Glass style={styles.search}>
          <Icon name="search" size={18} color={c.secondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Cerca: panca, squat, lat machine…"
            placeholderTextColor={c.tertiary}
            style={[styles.input, { color: c.label }]}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {q ? (
            <IconButton
              icon="xmark"
              size={28}
              onPress={() => setQ('')}
              accessibilityLabel="Cancella ricerca"
              plain
            />
          ) : null}
        </Glass>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          keyboardShouldPersistTaps="handled"
        >
          <Chip
            label="Tutti"
            selected={!filter}
            onPress={() => setFilter(null)}
          />
          {MUSCLE_FILTERS.map(f => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(filter === f.key ? null : f.key)}
            />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={results}
        keyExtractor={e => e.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: insets.bottom + 24,
        }}
        initialNumToRender={14}
        ListHeaderComponent={
          q.trim() ? (
            <Tap onPress={() => pick(undefined, q.trim())} scaleTo={0.98}>
              <View style={[styles.row, { backgroundColor: c.card }]}>
                <View style={[styles.plus, { backgroundColor: c.accentSoft }]}>
                  <Icon name="plus" size={22} color={c.accent} />
                </View>
                <View style={styles.flex}>
                  <T v="headline" numberOfLines={1}>
                    Usa «{q.trim()}»
                  </T>
                  <T v="footnote" color="secondary">
                    Esercizio personalizzato, senza animazione
                  </T>
                </View>
              </View>
            </Tap>
          ) : null
        }
        renderItem={({ item }) => (
          <Tap onPress={() => pick(item.id, displayName(item))} scaleTo={0.98}>
            <View style={[styles.row, { backgroundColor: c.card }]}>
              <ExerciseThumb
                catalogId={item.id}
                kind={item.category === 'cardio' ? 'cardio' : 'reps'}
                size={52}
              />
              <View style={styles.flex}>
                <T v="headline" numberOfLines={2}>
                  {displayName(item)}
                </T>
                <T v="footnote" color="secondary" numberOfLines={1}>
                  {[
                    item.primary.map(muscleLabel).join(', '),
                    equipmentLabel(item.equipment),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </T>
                {item.nameIt ? (
                  <T v="caption" color="tertiary" numberOfLines={1}>
                    {item.name}
                  </T>
                ) : null}
              </View>
            </View>
          </Tap>
        )}
        ListEmptyComponent={
          <T v="subhead" color="secondary" align="center" style={styles.empty}>
            Nessun esercizio trovato. Puoi usare il nome che hai scritto come
            esercizio personalizzato.
          </T>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingBottom: 8 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    marginBottom: 8,
  },
  side: { width: 44 },
  search: {
    marginHorizontal: GUTTER,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 0 },
  filters: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  plus: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
  empty: { marginTop: 40, paddingHorizontal: 24 },
});
