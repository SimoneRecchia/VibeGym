/**
 * Numeric input built for sweaty thumbs: big value you can type directly,
 * flanked by round − / + buttons that repeat while held.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { numeric } from '../theme/typography';
import { T } from './Text';
import { Tap } from './Pressable';
import { Icon } from './Icon';
import { fmtNum } from '../core/format';
import { parseDecimal } from '../core/units';
import { haptic } from '../services/haptics';

interface Props {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  unit?: string;
  label?: string;
  size?: 'l' | 'm';
  /** Custom display (e.g. mm:ss); typing is disabled when provided. */
  format?: (v: number) => string;
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  decimals = 1,
  unit,
  label,
  size = 'l',
  format,
}: Props) {
  const { c } = useTheme();
  const [text, setText] = useState(fmtNum(value, decimals));
  const [focused, setFocused] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!focused) setText(fmtNum(value, decimals));
  }, [value, decimals, focused]);

  const clamp = (v: number) =>
    Math.min(max, Math.max(min, Math.round(v * 1000) / 1000));
  const bump = (dir: 1 | -1) => {
    const next = clamp(valueRef.current + dir * step);
    if (next !== valueRef.current) {
      haptic('selection');
      onChange(next);
    }
  };
  const startRepeat = (dir: 1 | -1) => {
    stopRepeat();
    repeat.current = setInterval(() => bump(dir), 90);
  };
  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => stopRepeat, []);

  const btn = size === 'l' ? 52 : 40;
  const font = size === 'l' ? numeric(44) : numeric(28);

  return (
    <View style={styles.wrap}>
      {label ? (
        <T
          v="footnoteStrong"
          color="secondary"
          align="center"
          style={styles.label}
        >
          {label.toUpperCase()}
        </T>
      ) : null}
      <View style={styles.row}>
        <RoundBtn
          dir={-1}
          size={btn}
          step={step}
          onBump={bump}
          onRepeat={startRepeat}
          onStop={stopRepeat}
        />
        <View style={styles.center}>
          {format ? (
            <T
              style={[font, { color: c.label }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {format(value)}
            </T>
          ) : (
            <TextInput
              value={text}
              onChangeText={t => {
                setText(t);
                const v = parseDecimal(t);
                if (v != null) onChange(clamp(v));
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setText(fmtNum(valueRef.current, decimals));
              }}
              keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
              selectTextOnFocus
              style={[font, styles.input, { color: c.label }]}
              accessibilityLabel={label}
            />
          )}
          {unit ? (
            <T v="subheadStrong" color="secondary">
              {unit}
            </T>
          ) : null}
        </View>
        <RoundBtn
          dir={1}
          size={btn}
          step={step}
          onBump={bump}
          onRepeat={startRepeat}
          onStop={stopRepeat}
        />
      </View>
    </View>
  );
}

interface RoundBtnProps {
  dir: 1 | -1;
  size: number;
  step: number;
  onBump: (dir: 1 | -1) => void;
  onRepeat: (dir: 1 | -1) => void;
  onStop: () => void;
}

function RoundBtn({
  dir,
  size,
  step,
  onBump,
  onRepeat,
  onStop,
}: RoundBtnProps) {
  const { c } = useTheme();
  return (
    <Tap
      onPress={() => onBump(dir)}
      onLongPress={() => onRepeat(dir)}
      onPressOut={onStop}
      delayLongPress={350}
      feedback={null}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={
        dir > 0
          ? `Aumenta di ${fmtNum(step, 2)}`
          : `Diminuisci di ${fmtNum(step, 2)}`
      }
    >
      <View
        style={[
          styles.round,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: c.fill3,
          },
        ]}
      >
        <Icon
          name={dir > 0 ? 'plus' : 'minus'}
          size={size * 0.44}
          color={c.label}
          weight={2.4}
        />
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: { alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  input: { textAlign: 'center', padding: 0, minWidth: 80 },
});
