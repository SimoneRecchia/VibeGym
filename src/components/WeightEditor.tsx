import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Weight, WeightUnit } from '../lib/types';
import { GlassButton } from './GlassButton';
import { Icon } from './Icon';
import { formatWeight } from '../lib/format';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  exerciseName: string;
  setNumber: number; // 1-based
  suggested?: Weight;
  current?: Weight | null;
  defaultUnit: WeightUnit;
  onCancel: () => void;
  onSave: (w: Weight | null) => void;
}

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Modal weight editor: numeric input + unit toggle (kg / lb / corpo libero).
 * The unit chip row replaces the free-text input from v1 — keeps charts and
 * analytics clean while still being faster than typing "40 kg" each time.
 */
export function WeightEditor({
  visible,
  exerciseName,
  setNumber,
  suggested,
  current,
  defaultUnit,
  onCancel,
  onSave,
}: Props) {
  const { palette, mode } = useTheme();
  const [unit, setUnit] = useState<WeightUnit>(current?.unit ?? suggested?.unit ?? defaultUnit);
  const [text, setText] = useState<string>(formatNumericInput(current?.value));

  useEffect(() => {
    if (visible) {
      setUnit(current?.unit ?? suggested?.unit ?? defaultUnit);
      setText(formatNumericInput(current?.value));
    }
  }, [visible, current?.unit, current?.value, suggested?.unit, defaultUnit]);

  const presetSuggested = () => {
    if (!suggested) return;
    setUnit(suggested.unit);
    setText(formatNumericInput(suggested.value));
    haptic('light');
  };

  const handleSave = () => {
    const trimmed = text.replace(',', '.').trim();
    if (!trimmed) {
      onSave(null);
      return;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      onSave(null);
      return;
    }
    onSave({ value: n, unit });
  };

  const handleClear = () => {
    onSave(null);
  };

  const units: WeightUnit[] = ['kg', 'lb', 'bw'];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={[styles.bg, { backgroundColor: palette.scrim }]} onPress={onCancel}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: mode === 'dark' ? 'rgba(22,22,26,0.97)' : 'rgba(255,255,255,0.99)',
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <Text style={[styles.label, { color: palette.textDim }]}>SERIE {setNumber}</Text>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
            {exerciseName}
          </Text>
          {suggested && (
            <Pressable onPress={presetSuggested} style={styles.suggestedRow} hitSlop={6}>
              <Text style={[styles.suggestedLabel, { color: palette.textDim }]}>Scheda:</Text>
              <View
                style={[
                  styles.suggestedChip,
                  { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
                ]}
              >
                <Text style={[styles.suggestedText, { color: palette.accent }]}>
                  {formatWeight(suggested)}
                </Text>
                <Icon name="copy" color={palette.accent} size={12} />
              </View>
            </Pressable>
          )}

          {unit !== 'bw' && (
            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={formatNumericInput(suggested?.value) || '0'}
                placeholderTextColor={palette.textFaint}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                autoFocus
                selectTextOnFocus
                style={[
                  styles.input,
                  {
                    color: palette.text,
                    backgroundColor: palette.surface,
                    borderColor: palette.glassBorderStrong,
                  },
                ]}
              />
              <Text style={[styles.inputUnit, { color: palette.textDim }]}>{unit}</Text>
            </View>
          )}

          {unit === 'bw' && (
            <View style={styles.bwRow}>
              <Text style={[styles.bwLabel, { color: palette.text }]}>Corpo libero</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="0"
                  placeholderTextColor={palette.textFaint}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  style={[
                    styles.input,
                    {
                      color: palette.text,
                      backgroundColor: palette.surface,
                      borderColor: palette.glassBorderStrong,
                    },
                  ]}
                />
                <Text style={[styles.inputUnit, { color: palette.textDim }]}>+ kg (zavorra)</Text>
              </View>
            </View>
          )}

          {/* Unit picker */}
          <View style={styles.unitsRow}>
            {units.map(u => (
              <Pressable
                key={u}
                onPress={() => {
                  setUnit(u);
                  if (u === 'bw') setText(text || '0');
                  haptic('light');
                }}
                style={({ pressed }) => [
                  styles.unitChip,
                  {
                    backgroundColor:
                      u === unit
                        ? palette.accent
                        : palette.glassFill,
                    borderColor:
                      u === unit ? palette.accent : palette.glassBorderStrong,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.unitChipText,
                    { color: u === unit ? '#fff' : palette.text },
                  ]}
                >
                  {u === 'bw' ? 'corpo libero' : u}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.hint, { color: palette.textFaint }]}>
            {unit === 'bw'
              ? 'Lascia 0 per peso corporeo puro, o aggiungi i kg della zavorra.'
              : 'Lascia vuoto se hai usato il peso della scheda.'}
          </Text>

          <View style={styles.actions}>
            <GlassButton
              title="Rimuovi"
              icon="trash"
              variant="ghost"
              onPress={handleClear}
              style={{ flex: 1 }}
              size="md"
            />
            <GlassButton
              title="Annulla"
              variant="secondary"
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Salva"
              onPress={handleSave}
              style={{ flex: 1 }}
              icon="check"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const formatNumericInput = (n: number | undefined | null): string => {
  if (n == null) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.lg,
  },
  label: {
    ...typography.caption2,
    letterSpacing: 0.7,
  },
  title: {
    ...typography.title2,
    marginTop: 4,
    marginBottom: space.md,
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: space.md,
  },
  suggestedLabel: {
    ...typography.footnote,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  suggestedText: {
    ...typography.footnote,
    fontWeight: '700',
  },
  bwRow: {
    gap: 6,
  },
  bwLabel: {
    ...typography.headline,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: space.md,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '700',
  },
  inputUnit: {
    ...typography.subhead,
    fontWeight: '700',
    minWidth: 30,
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: space.sm,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  unitChipText: {
    ...typography.footnote,
    fontWeight: '700',
  },
  hint: {
    ...typography.caption1,
    marginBottom: space.md,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
