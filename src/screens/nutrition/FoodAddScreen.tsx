/**
 * Add food to a meal: instant search in everyday foods, your foods and the
 * products already used; packaged products from Open Food Facts on demand.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';
import { TextField } from '../../ui/TextField';
import { Segmented } from '../../ui/Segmented';
import { Chip } from '../../ui/Chip';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { toast } from '../../ui/Toast';
import { Food } from '../../core/types';
import {
  CATEGORY_LABEL,
  GENERIC,
  MEAL_LABEL,
  genericFood,
  searchFoods,
} from '../../nutrition/foods';
import { searchProducts } from '../../nutrition/off';
import { fmtNum } from '../../core/format';
import { ScreenProps } from '../../navigation/types';
import { FoodEntrySheet } from './FoodEntrySheet';

type Tab = 'recent' | 'fav' | 'mine';

interface Online {
  q: string;
  status: 'loading' | 'done' | 'error';
  items: Food[];
}

export function FoodAddScreen({ route, navigation }: ScreenProps<'FoodAdd'>) {
  const { day, meal, pickId } = route.params;
  const { c } = useTheme();
  const lib = useStore(s => s.foodLib);
  const logFood = useStore(s => s.logFood);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [online, setOnline] = useState<Online | null>(null);
  const [picked, setPicked] = useState<Food | null>(null);
  const [added, setAdded] = useState(0);

  const resolve = useMemo(() => {
    const map = new Map<string, Food>();
    lib.cache.forEach(f => map.set(f.id, f));
    lib.custom.forEach(f => map.set(f.id, f));
    return (id: string) => map.get(id) ?? genericFood(id);
  }, [lib]);

  // Returning from "Crea alimento" opens the new food right away.
  useEffect(() => {
    if (!pickId) return;
    const f = resolve(pickId);
    if (f) setPicked(f);
    navigation.setParams({ pickId: undefined });
  }, [pickId, resolve, navigation]);

  const pool = useMemo(
    () => [...lib.custom, ...lib.cache, ...GENERIC],
    [lib.custom, lib.cache],
  );
  const query = q.trim();
  const local = useMemo(() => searchFoods(query, pool), [query, pool]);

  const lists: Record<Tab, Food[]> = {
    recent: lib.recents.map(resolve).filter(Boolean) as Food[],
    fav: lib.favorites.map(resolve).filter(Boolean) as Food[],
    mine: [...lib.custom].reverse(),
  };

  const searchOnline = async () => {
    if (query.length < 2) return;
    setOnline({ q: query, status: 'loading', items: [] });
    try {
      const items = await searchProducts(query);
      setOnline({ q: query, status: 'done', items });
    } catch {
      setOnline({ q: query, status: 'error', items: [] });
    }
  };

  const shownOnline = online && online.q === query ? online : null;

  return (
    <Screen
      title={MEAL_LABEL[meal]}
      eyebrow={added ? `${added} aggiunti` : 'Aggiungi a'}
      close
      keyboard
    >
      <TextField
        value={q}
        onChangeText={setQ}
        placeholder="Cerca un alimento o un prodotto"
        autoFocus
        returnKeyType="search"
        onSubmitEditing={searchOnline}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <View style={styles.actions}>
        <Chip
          icon="barcode"
          label="Scansiona"
          tinted
          onPress={() => navigation.navigate('Scanner', { day, meal })}
        />
        <Chip
          icon="plus"
          label="Crea alimento"
          tinted
          onPress={() =>
            navigation.navigate('CustomFood', {
              day,
              meal,
              name: query || undefined,
            })
          }
        />
      </View>

      {query ? (
        <>
          {local.length ? (
            <List foods={local} onPick={setPicked} />
          ) : (
            <T v="subhead" color="secondary" style={styles.empty}>
              Nessun alimento trovato tra quelli comuni.
            </T>
          )}

          <Tap
            onPress={searchOnline}
            disabled={shownOnline?.status === 'loading' || query.length < 2}
            style={styles.onlineBtn}
          >
            <View style={[styles.onlineRow, { backgroundColor: c.card }]}>
              <Icon name="search" size={18} color={c.accent} />
              <T v="subheadStrong" color="accent" style={styles.flex}>
                Cerca «{query}» tra i prodotti confezionati
              </T>
              {shownOnline?.status === 'loading' ? (
                <ActivityIndicator color={c.accent} />
              ) : null}
            </View>
          </Tap>

          {shownOnline?.status === 'done' ? (
            shownOnline.items.length ? (
              <>
                <T v="footnoteStrong" color="secondary" style={styles.head}>
                  PRODOTTI · OPEN FOOD FACTS
                </T>
                <List foods={shownOnline.items} onPick={setPicked} />
              </>
            ) : (
              <T v="subhead" color="secondary" style={styles.empty}>
                Nessun prodotto trovato. Prova con marca e nome, oppure
                scansiona il codice a barre.
              </T>
            )
          ) : shownOnline?.status === 'error' ? (
            <T v="subhead" color="secondary" style={styles.empty}>
              Connessione non disponibile: i prodotti confezionati si cercano
              online. Gli alimenti comuni funzionano anche offline.
            </T>
          ) : null}
        </>
      ) : (
        <>
          <Segmented
            options={[
              { key: 'recent', label: 'Recenti' },
              { key: 'fav', label: 'Preferiti' },
              { key: 'mine', label: 'Creati da te' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <View style={styles.gap} />
          {lists[tab].length ? (
            <List foods={lists[tab]} onPick={setPicked} />
          ) : (
            <T v="subhead" color="secondary" style={styles.empty}>
              {tab === 'recent'
                ? 'Gli alimenti che aggiungi compaiono qui, pronti per la prossima volta.'
                : tab === 'fav'
                ? 'Tocca la stella quando aggiungi un alimento per ritrovarlo qui.'
                : 'Crea i tuoi alimenti e le tue ricette con i valori della confezione.'}
            </T>
          )}
        </>
      )}

      <T v="caption" color="tertiary" style={styles.credits}>
        Alimenti comuni: USDA FoodData Central (pubblico dominio) via TempoLife,
        CC BY 4.0. Prodotti: Open Food Facts, ODbL.
      </T>

      <FoodEntrySheet
        visible={!!picked}
        onClose={() => setPicked(null)}
        food={picked}
        mode="add"
        initial={{ qty: 100, meal }}
        onSubmit={v => {
          if (!picked) return;
          logFood({
            day,
            meal: v.meal,
            food: picked,
            qty: v.qty,
            portion: v.portion,
          });
          toast(
            `${picked.name} aggiunto a ${MEAL_LABEL[v.meal].toLowerCase()}`,
          );
          setAdded(a => a + 1);
          setPicked(null);
        }}
      />
    </Screen>
  );
}

function List({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.list, { backgroundColor: c.card }]}>
      {foods.map((f, i) => (
        <Tap key={f.id} onPress={() => onPick(f)} scaleTo={0.99}>
          <View
            style={[
              styles.row,
              i > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.separator,
              },
            ]}
          >
            <View style={styles.flex}>
              <T v="body" numberOfLines={1}>
                {f.name}
              </T>
              <T v="footnote" color="secondary" numberOfLines={1}>
                {f.brand ??
                  (f.source === 'custom'
                    ? 'Creato da te'
                    : f.category
                    ? CATEGORY_LABEL[f.category]
                    : 'Prodotto')}
              </T>
            </View>
            <View style={styles.kcal}>
              <T v="subheadStrong">{fmtNum(f.kcal, 0)} kcal</T>
              <T v="caption" color="tertiary">
                100 {f.unit}
              </T>
            </View>
          </View>
        </Tap>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  gap: { height: 12 },
  head: { marginTop: 20, marginBottom: 8, marginLeft: 16 },
  empty: { marginVertical: 16, marginHorizontal: 8 },
  list: { borderRadius: 22, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  kcal: { alignItems: 'flex-end' },
  onlineBtn: { marginTop: 12 },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  credits: { marginTop: 24, marginHorizontal: 8 },
});
