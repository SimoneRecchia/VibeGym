import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { Reps, Weight, WeightUnit } from '../lib/types';
import { GlassButton } from './GlassButton';
import { Icon } from './Icon';
import { formatReps } from '../lib/format';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  exerciseName: string;
  setNumber: number; // 1-based
  suggested?: Weight;
  current?: Weight | null;
  repsTarget?: Reps;
  currentReps?: number | null;
  /** Which field the user tapped — briefly highlighted + focused. */
  focus?: 'weight' | 'reps';
  defaultUnit: WeightUnit;
  onCancel: () => void;
  onSave: (weight: Weight | null, reps: number | null) => void;
}

const numStr = (n: number | undefined | null): string => {
  if (n == null) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
};

export function SetEditor({
  visible,
  exerciseName,
  setNumber,
  suggested,
  current,
  repsTarget,
  currentReps,
  focus,
  defaultUnit,
  onCancel,
  onSave,
}: Props) {
  const { palette, mode } = useTheme();

  const suggestedWeight = current?.value ?? suggested?.value ?? null;
  const targetReps = currentReps ?? repsTarget?.value ?? null;

  const [weightText, setWeightText] = useState<string>(numStr(suggestedWeight));
  const [repsText, setRepsText] = useState<string>(numStr(targetReps));

  const weightGlow = useRef(new Animated.Value(0)).current;
  const repsGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setWeightText(numStr(suggestedWeight));
    setRepsText(numStr(targetReps));
    weightGlow.setValue(0);
    repsGlow.setValue(0);
    const g = focus === 'reps' ? repsGlow : focus === 'weight' ? weightGlow : null;
    if (g) {
      Animated.sequence([
        Animated.timing(g, { toValue: 1, duration: 160, useNativeDriver: false }),
        Animated.delay(480),
        Animated.timing(g, { toValue: 0, duration: 650, useNativeDriver: false }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const weightUnit = defaultUnit === 'lb' ? 'lb' : 'kg';
  const repUnit = repsTarget?.unit ?? 'times';
  const repsFieldLabel = repUnit === 'times' ? 'Ripetizioni' : 'Durata';
  const repsUnitLabel = repUnit === 'times' ? 'rip' : repUnit === 'seconds' ? 's' : 'min';
  const repTargetVal = repsTarget?.value ?? null;

  const repsNum = parseInt(repsText, 10);
  const repsColor =
    repTargetVal == null || !Number.isFinite(repsNum) || repsNum === repTargetVal
      ? palette.text
      : repsNum > repTargetVal
      ? palette.success
      : palette.danger;

  const bump = (text: string, setText: (v: string) => void, delta: number, fallback: number | null) => {
    const cur = parseFloat(text.replace(',', '.'));
    const base = Number.isFinite(cur) ? cur : fallback ?? 0;
    setText(numStr(Math.max(0, Math.round((base + delta) * 100) / 100)));
    haptic('light');
  };

  const parseWeight = (): Weight | null => {
    const t = weightText.replace(',', '.').trim();
    if (!t) return null;
    const n = parseFloat(t);
    if (!Number.isFinite(n) || n < 0) return null;
    if (n === 0) return { value: 0, unit: 'bw' };
    return { value: n, unit: defaultUnit === 'bw' ? 'bw' : defaultUnit };
  };
  const parseReps = (): number | null => {
    const t = repsText.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const stepBtn = (onPress: () => void, name: 'minus' | 'plus') => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: palette.surface, borderColor: palette.glassBorderStrong, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={name} color={palette.text} size={18} />
    </Pressable>
  );

  const valueBox = (
    glow: Animated.Value,
    text: string,
    setText: (v: string) => void,
    unit: string,
    decimal: boolean,
    autoFocus: boolean,
    textColor: string,
    placeholder: string
  ) => (
    <View style={styles.valueWrap}>
      <View style={[styles.valueBox, { backgroundColor: palette.surface, borderColor: palette.glassBorderStrong }]}>
        <TextInput
          value={text}
          onChangeText={t => setText(decimal ? t.replace(/[^0-9.,]/g, '') : t.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          keyboardType={decimal ? (Platform.OS === 'ios' ? 'decimal-pad' : 'numeric') : 'number-pad'}
          autoFocus={autoFocus}
          selectTextOnFocus
          style={[styles.input, { color: textColor }]}
        />
        <Text style={[styles.unit, { color: palette.textDim }]}>{unit}</Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.valueGlow, { opacity: glow, borderColor: palette.accent }]}
      />
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.bg, { backgroundColor: palette.scrim }]} onPress={onCancel}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: mode === 'dark' ? 'rgba(22,22,26,0.98)' : 'rgba(255,255,255,0.99)',
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: palette.textDim }]}>SERIE {setNumber}</Text>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
            {exerciseName}
          </Text>

          {/* RIPETIZIONI / DURATA */}
          <View style={styles.field}>
            <View style={styles.fieldHead}>
              <Icon name="repeat" color={palette.textDim} size={15} />
              <Text style={[styles.fieldLabel, { color: palette.text }]}>{repsFieldLabel}</Text>
              <View style={{ flex: 1 }} />
              <View style={[styles.targetChip, { backgroundColor: palette.glassFill, borderColor: palette.glassBorderStrong }]}>
                <Icon name="target" color={palette.textDim} size={13} />
                <Text style={[styles.targetText, { color: palette.textDim }]}>{formatReps(repsTarget) || '—'}</Text>
              </View>
            </View>
            <View style={styles.stepperRow}>
              {stepBtn(() => bump(repsText, setRepsText, -1, targetReps), 'minus')}
              {valueBox(repsGlow, repsText, setRepsText, repsUnitLabel, false, focus === 'reps', repsColor, 'AMRAP')}
              {stepBtn(() => bump(repsText, setRepsText, 1, targetReps), 'plus')}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.divider }]} />

          {/* PESO */}
          <View style={styles.field}>
            <View style={styles.fieldHead}>
              <Icon name="dumbbell" color={palette.textDim} size={15} />
              <Text style={[styles.fieldLabel, { color: palette.text }]}>Peso</Text>
            </View>
            <View style={styles.stepperRow}>
              {stepBtn(() => bump(weightText, setWeightText, -1, suggestedWeight), 'minus')}
              {valueBox(weightGlow, weightText, setWeightText, weightUnit, true, focus === 'weight', palette.text, '—')}
              {stepBtn(() => bump(weightText, setWeightText, 1, suggestedWeight), 'plus')}
            </View>
          </View>

          <View style={styles.actions}>
            <GlassButton title="Ripristina" variant="ghost" onPress={() => onSave(null, null)} size="md" />
            <GlassButton title="Annulla" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <GlassButton title="Salva" icon="check" onPress={() => onSave(parseWeight(), parseReps())} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.lg,
  },
  eyebrow: { ...typography.caption2, letterSpacing: 0.7 },
  title: { ...typography.title2, marginTop: 4, marginBottom: space.lg },
  field: {},
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  fieldLabel: { ...typography.headline },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  targetText: { ...typography.footnote, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space.lg },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 52,
    height: 60,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  valueWrap: { flex: 1 },
  valueBox: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: 12,
  },
  valueGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.md + 2,
    borderWidth: 2,
  },
  input: { flex: 1, textAlign: 'right', fontSize: 30, fontWeight: '800', paddingVertical: 0 },
  unit: { ...typography.headline, minWidth: 34 },
  actions: { flexDirection: 'row', gap: 8, marginTop: space.xl },
});
