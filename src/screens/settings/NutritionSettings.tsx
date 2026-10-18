import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Row, Section } from '../../ui/List';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { Chip } from '../../ui/Chip';
import { T } from '../../ui/Text';
import { NutritionGoals } from '../../core/types';
import { MACRO_PRESETS, goalOffset } from '../../nutrition/energy';
import { useDayNutrition } from '../../nutrition/useDayNutrition';
import { dayKey } from '../../core/dates';
import { fmtNum } from '../../core/format';
import { numeric } from '../../theme/typography';
import { SettingsProps } from '../../navigation/types';
import {
  MACRO_COLOR,
  MACRO_KEYS,
  MACRO_LABEL,
  MacroKey,
} from '../nutrition/macroColors';

export function NutritionSettings({
  navigation,
}: SettingsProps<'NutritionSettings'>) {
  const { c } = useTheme();
  const g = useStore(s => s.settings.nutrition);
  const profile = useStore(s => s.profile);
  const weight = useStore(s => s.body[s.body.length - 1]?.weightKg);
  const update = useStore(s => s.updateSettings);
  const today = useDayNutrition(dayKey());
  const set = (patch: Partial<NutritionGoals>) =>
    update(s => ({ ...s, nutrition: { ...s.nutrition, ...patch } }));

  const missing = [
    !profile.sex && 'sesso',
    !profile.birthDate && 'età',
    !profile.heightCm && 'altezza',
    !weight && 'peso',
  ].filter(Boolean) as string[];

  // Percentages: changing one macro takes the difference from the others.
  const setPct = (k: MacroKey, v: number) => {
    const others = MACRO_KEYS.filter(x => x !== k);
    const rest = 100 - v;
    const prev = g.pct[others[0]] + g.pct[others[1]] || 1;
    const a = Math.round(((g.pct[others[0]] / prev) * rest) / 5) * 5;
    set({ pct: { ...g.pct, [k]: v, [others[0]]: a, [others[1]]: rest - a } });
  };

  const perKg = weight ? g.grams.protein / weight : null;

  return (
    <Screen title="Nutrizione" back>
      <Card style={styles.summary}>
        <T v="footnote" color="secondary">
          Obiettivo di oggi
        </T>
        <View style={styles.kcalRow}>
          <T style={[numeric(40), { color: c.label }]}>
            {fmtNum(today.kcalGoal, 0)}
          </T>
          <T v="headline" color="secondary">
            kcal
          </T>
        </View>
        <View style={styles.macroRow}>
          {MACRO_KEYS.map(k => (
            <View key={k} style={styles.macroCell}>
              <View style={[styles.dot, { backgroundColor: MACRO_COLOR[k] }]} />
              <T v="footnote" color="secondary">
                {MACRO_LABEL[k]}
              </T>
              <T v="headline">{fmtNum(today.macros[k], 0)} g</T>
            </View>
          ))}
        </View>
      </Card>

      {missing.length ? (
        <Section footer="Servono per stimare il metabolismo basale.">
          <Row
            title={`Aggiungi ${missing.join(', ')}`}
            icon="person"
            chevron
            onPress={() =>
              missing.length === 1 && missing[0] === 'peso'
                ? navigation.navigate('Body')
                : navigation.navigate('ProfileEdit')
            }
          />
        </Section>
      ) : null}

      <Section title="Obiettivo">
        <View style={styles.pad}>
          <Segmented
            options={[
              { key: 'lose', label: 'Dimagrire' },
              { key: 'maintain', label: 'Mantenere' },
              { key: 'gain', label: 'Massa' },
            ]}
            value={g.goal}
            onChange={goal => set({ goal })}
          />
          {g.goal !== 'maintain' ? (
            <View style={styles.gapTop}>
              <Stepper
                label={
                  g.goal === 'lose'
                    ? 'Kg da perdere a settimana'
                    : 'Kg da prendere a settimana'
                }
                value={g.rate}
                onChange={rate => set({ rate })}
                step={0.25}
                min={0.25}
                max={1}
                decimals={2}
                unit="kg"
                size="m"
              />
              <T
                v="footnote"
                color="secondary"
                align="center"
                style={styles.gapTop}
              >
                {goalOffset(g) > 0 ? '+' : '−'}
                {fmtNum(Math.abs(goalOffset(g)), 0)} kcal al giorno rispetto al
                consumo
              </T>
            </View>
          ) : null}
        </View>
      </Section>

      <Section
        title="Calorie"
        footer={
          g.macroMode === 'g'
            ? 'Con i macro in grammi le calorie sono la loro somma.'
            : g.mode === 'auto'
            ? g.adaptive
              ? 'Ogni giorno l’obiettivo segue quanto consumi davvero: metabolismo, passi e allenamenti. Più ti muovi, più puoi mangiare.'
              : 'L’obiettivo resta lo stesso ogni giorno, calcolato sul tuo consumo abituale.'
            : undefined
        }
      >
        {g.macroMode === 'pct' ? (
          <>
            <View style={styles.pad}>
              <Segmented
                options={[
                  { key: 'auto', label: 'Calcolate' },
                  { key: 'manual', label: 'Fisse' },
                ]}
                value={g.mode}
                onChange={mode => set({ mode })}
              />
            </View>
            {g.mode === 'auto' ? (
              <Row
                title="Segui il consumo del giorno"
                toggle={{
                  value: g.adaptive,
                  onChange: adaptive => set({ adaptive }),
                }}
              />
            ) : (
              <View style={styles.pad}>
                <Stepper
                  value={g.kcal}
                  onChange={kcal => set({ kcal })}
                  step={50}
                  min={1000}
                  max={6000}
                  decimals={0}
                  unit="kcal"
                  size="m"
                />
              </View>
            )}
          </>
        ) : null}
      </Section>

      <Section
        title="Macronutrienti"
        footer={
          g.macroMode === 'pct'
            ? 'Quote delle calorie. Le proteine arrivano a 4 kcal per grammo, come i carboidrati; i grassi a 9.'
            : perKg
            ? `Proteine: ${fmtNum(
                perKg,
                1,
              )} g per kg di peso corporeo. Per chi si allena si consigliano 1,6–2,2 g/kg.`
            : undefined
        }
      >
        <View style={styles.pad}>
          <Segmented
            options={[
              { key: 'pct', label: 'Percentuali' },
              { key: 'g', label: 'Grammi' },
            ]}
            value={g.macroMode}
            onChange={macroMode =>
              set(
                macroMode === 'g'
                  ? { macroMode, grams: { ...today.macros } }
                  : { macroMode },
              )
            }
          />
          {g.macroMode === 'pct' ? (
            <View style={styles.presets}>
              {MACRO_PRESETS.map(p => (
                <Chip
                  key={p.key}
                  label={p.label}
                  selected={MACRO_KEYS.every(k => g.pct[k] === p.pct[k])}
                  onPress={() => set({ pct: p.pct })}
                />
              ))}
            </View>
          ) : null}
          {MACRO_KEYS.map(k => (
            <View key={k} style={styles.gapTop}>
              {g.macroMode === 'pct' ? (
                <Stepper
                  label={`${MACRO_LABEL[k]} · ${fmtNum(today.macros[k], 0)} g`}
                  value={g.pct[k]}
                  onChange={v => setPct(k, v)}
                  step={5}
                  min={5}
                  max={80}
                  decimals={0}
                  unit="%"
                  size="m"
                />
              ) : (
                <Stepper
                  label={MACRO_LABEL[k]}
                  value={g.grams[k]}
                  onChange={v => set({ grams: { ...g.grams, [k]: v } })}
                  step={5}
                  min={0}
                  max={600}
                  decimals={0}
                  unit="g"
                  size="m"
                />
              )}
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginBottom: 28 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  macroRow: { flexDirection: 'row', marginTop: 12 },
  macroCell: { flex: 1, gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  pad: { padding: 14 },
  gapTop: { marginTop: 14 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
});
