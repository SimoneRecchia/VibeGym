/**
 * Everything saved with a weigh-in: weight, BMI, the composition estimated
 * from the impedance and the raw data sent by the scale.
 */
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../data/store';
import { BodyEntry } from '../../core/types';
import { COMPOSITION, bmiCategory } from '../../stats/body';
import { BODY_TYPES } from '../../body/composition';
import { SCALE_MODEL_LABEL } from '../../scale/miScale';
import { healthPlatformName } from '../../services/health';
import { fmtDate, fmtNum, fmtTime } from '../../core/format';
import { toDisplay } from '../../core/units';
import { numeric } from '../../theme/typography';

export function WeighDetailSheet({
  entry,
  onClose,
}: {
  entry: BodyEntry | null;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const unit = useStore(s => s.settings.unit);
  const remove = useStore(s => s.deleteBodyEntry);
  const e = entry;

  const confirmDelete = () =>
    e &&
    Alert.alert('Eliminare questa pesata?', fmtDate(e.date), [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          remove(e.id);
          onClose();
        },
      },
    ]);

  const metrics = e ? COMPOSITION.filter(m => e[m.key] != null) : [];
  return (
    <Sheet
      visible={!!e}
      onClose={onClose}
      title={e ? fmtDate(e.date) : ''}
      subtitle={
        e
          ? `${fmtTime(e.date)} · ${
              e.source === 'scale'
                ? e.scaleModel
                  ? SCALE_MODEL_LABEL[e.scaleModel]
                  : 'Bilancia'
                : e.source === 'health'
                ? `${e.sourceApp ?? 'Altra app'} via ${healthPlatformName}`
                : 'Inserita a mano'
            }`
          : undefined
      }
      scroll
    >
      {e ? (
        <View style={styles.gap}>
          <View style={styles.hero}>
            <T style={[numeric(48), { color: c.label }]}>
              {fmtNum(toDisplay(e.weightKg, unit), 1)}
            </T>
            <T v="title3" color="secondary">
              {unit}
            </T>
          </View>
          {e.bmi != null ? (
            <T v="subhead" color="secondary" align="center">
              IMC {fmtNum(e.bmi, 1)} · {bmiCategory(e.bmi)}
            </T>
          ) : null}

          {e.bodyType != null ? (
            <View style={[styles.type, { backgroundColor: c.accentSoft }]}>
              <T v="footnote" color="secondary">
                Tipo di corpo
              </T>
              <T v="headline" color="accent">
                {BODY_TYPES[e.bodyType]}
              </T>
            </View>
          ) : null}

          {metrics.length ? (
            <View style={[styles.grid, { backgroundColor: c.fill4 }]}>
              {metrics.map(m => (
                <View key={m.key} style={styles.cell}>
                  <T v="caption" color="secondary" numberOfLines={1}>
                    {m.label}
                  </T>
                  <T v="headline">
                    {fmtNum(e[m.key] as number, m.decimals)}
                    {m.unit ? ` ${m.unit}` : ''}
                  </T>
                </View>
              ))}
              {e.idealWeightKg != null ? (
                <View style={styles.cell}>
                  <T v="caption" color="secondary" numberOfLines={1}>
                    Peso ideale
                  </T>
                  <T v="headline">
                    {fmtNum(toDisplay(e.idealWeightKg, unit), 1)} {unit}
                  </T>
                </View>
              ) : null}
            </View>
          ) : e.impedance ? (
            <T v="footnote" color="secondary" align="center">
              Inserisci sesso, data di nascita e altezza nel profilo per
              calcolare la composizione di questa pesata.
            </T>
          ) : null}

          {e.impedance || e.scaleStamp ? (
            <View style={styles.raw}>
              <T v="footnote" color="tertiary">
                Dati della bilancia
                {e.impedance ? ` · impedenza ${e.impedance} Ω` : ''}
                {e.scaleStamp
                  ? ` · misurata alle ${fmtTime(e.scaleStamp)}`
                  : ''}
              </T>
            </View>
          ) : null}
          {metrics.length ? (
            <T v="footnote" color="tertiary">
              Stime calcolate dall'impedenza con le formule dell'app Mi Fit /
              Zepp Life: confronta l'andamento più che il singolo valore.
            </T>
          ) : null}

          <Button
            title="Elimina pesata"
            icon="trash"
            variant="destructive"
            onPress={confirmDelete}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  hero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  type: { borderRadius: 16, padding: 12, alignItems: 'center', gap: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 18,
    paddingVertical: 6,
  },
  cell: { width: '50%', paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  raw: { alignItems: 'center' },
});
