/**
 * How much did you eat? Grams (or ml) or the food's portions, with a live
 * preview of calories and macros. Used to add and to edit diary entries.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../data/store';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/Text';
import { Chip } from '../../ui/Chip';
import { Stepper } from '../../ui/Stepper';
import { Segmented } from '../../ui/Segmented';
import { Button, IconButton } from '../../ui/Button';
import { Food, MealKey, Portion } from '../../core/types';
import { MEALS, nutrientsFor, portionsOf } from '../../nutrition/foods';
import { fmtNum } from '../../core/format';
import { numeric } from '../../theme/typography';
import { MACRO_COLOR, MACRO_KEYS, MACRO_LABEL } from './macroColors';

export interface EntryValue {
  qty: number;
  meal: MealKey;
  portion?: { label: string; count: number };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  food: Food | null;
  initial: EntryValue;
  mode: 'add' | 'edit';
  onSubmit: (v: EntryValue) => void;
  onDelete?: () => void;
}

const QUICK_G = [50, 100, 150, 200];
const QUICK_ML = [100, 200, 250, 330];

export function FoodEntrySheet({
  visible,
  onClose,
  food,
  initial,
  mode,
  onSubmit,
  onDelete,
}: Props) {
  const { c } = useTheme();
  const favorite = useStore(s =>
    food ? s.foodLib.favorites.includes(food.id) : false,
  );
  const toggleFavorite = useStore(s => s.toggleFavorite);
  const portions = useMemo(() => (food ? portionsOf(food) : []), [food]);

  // Unit: -1 = grams/ml, otherwise index into `portions`.
  const [unitIdx, setUnitIdx] = useState(-1);
  const [amount, setAmount] = useState(100);
  const [meal, setMeal] = useState<MealKey>(initial.meal);

  useEffect(() => {
    if (!visible || !food) return;
    setMeal(initial.meal);
    const pi = initial.portion
      ? portions.findIndex(p => p.label === initial.portion!.label)
      : mode === 'add' && portions.length && !food.packageG
      ? 0
      : -1;
    if (pi >= 0) {
      setUnitIdx(pi);
      setAmount(
        initial.portion?.count ??
          (mode === 'add' ? 1 : initial.qty / portions[pi].g),
      );
    } else {
      setUnitIdx(-1);
      setAmount(Math.round(initial.qty));
    }
    // Reset only when a sheet opens for a food.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, food?.id]);

  if (!food) return null;
  const u = food.unit;
  const portion: Portion | undefined =
    unitIdx >= 0 ? portions[unitIdx] : undefined;
  const qty = portion ? amount * portion.g : amount;
  const n = nutrientsFor(food, qty);

  const pickUnit = (i: number) => {
    if (i === unitIdx) return;
    // Keep the same quantity when switching unit.
    if (i >= 0)
      setAmount(Math.max(0.5, Math.round((qty / portions[i].g) * 2) / 2));
    else setAmount(Math.round(qty));
    setUnitIdx(i);
  };

  const submit = () =>
    onSubmit({
      qty: Math.round(qty * 10) / 10,
      meal,
      portion: portion ? { label: portion.label, count: amount } : undefined,
    });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={food.name}
      subtitle={[food.brand, `${fmtNum(food.kcal, 0)} kcal per 100 ${u}`]
        .filter(Boolean)
        .join(' · ')}
      action={
        <IconButton
          icon="star"
          plain
          size={36}
          tint={favorite ? c.yellow : undefined}
          color={favorite ? '#fff' : c.secondary}
          onPress={() => toggleFavorite(food.id)}
          accessibilityLabel={
            favorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'
          }
        />
      }
    >
      {portions.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.units}
          style={styles.unitsWrap}
        >
          <Chip
            label={u === 'ml' ? 'ml' : 'grammi'}
            selected={unitIdx === -1}
            onPress={() => pickUnit(-1)}
          />
          {portions.map((p, i) => (
            <Chip
              key={p.label + p.g}
              label={`${p.label} · ${fmtNum(p.g, 0)} ${u}`}
              selected={unitIdx === i}
              onPress={() => pickUnit(i)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Stepper
        value={amount}
        onChange={setAmount}
        step={portion ? 0.5 : u === 'ml' ? 10 : 5}
        min={portion ? 0.5 : 1}
        max={portion ? 50 : 5000}
        decimals={portion ? 1 : 0}
        unit={
          portion ? (amount === 1 ? portion.label : `× ${portion.label}`) : u
        }
      />

      {!portion ? (
        <View style={styles.quick}>
          {(u === 'ml' ? QUICK_ML : QUICK_G).map(g => (
            <Chip
              key={g}
              label={`${g} ${u}`}
              selected={amount === g}
              onPress={() => setAmount(g)}
            />
          ))}
        </View>
      ) : null}

      <View style={[styles.result, { backgroundColor: c.fill4 }]}>
        <View style={styles.kcal}>
          <T style={[numeric(34), { color: c.label }]}>{fmtNum(n.kcal, 0)}</T>
          <T v="subheadStrong" color="secondary">
            kcal
          </T>
          {portion ? (
            <T v="footnote" color="secondary" style={styles.qtyNote}>
              {fmtNum(qty, 0)} {u}
            </T>
          ) : null}
        </View>
        <View style={styles.macros}>
          {MACRO_KEYS.map(k => (
            <View key={k} style={styles.macro}>
              <View style={[styles.dot, { backgroundColor: MACRO_COLOR[k] }]} />
              <T v="footnote" color="secondary">
                {MACRO_LABEL[k]}
              </T>
              <T v="subheadStrong">{fmtNum(n[k], 1)} g</T>
            </View>
          ))}
        </View>
      </View>

      <Segmented
        options={MEALS.map(m => ({ key: m.key, label: m.label }))}
        value={meal}
        onChange={setMeal}
      />

      <Button
        title={mode === 'add' ? 'Aggiungi' : 'Salva'}
        icon={mode === 'add' ? 'plus' : 'check'}
        onPress={submit}
        style={styles.cta}
      />
      {onDelete ? (
        <Button
          title="Elimina"
          icon="trash"
          variant="plain"
          tint={c.red}
          onPress={onDelete}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  unitsWrap: { marginHorizontal: -20, marginBottom: 14 },
  units: { gap: 8, paddingHorizontal: 20 },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  result: {
    borderRadius: 20,
    padding: 14,
    marginVertical: 16,
    gap: 10,
  },
  kcal: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  qtyNote: { marginLeft: 'auto' },
  macros: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  cta: { marginTop: 16 },
});
