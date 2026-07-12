import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { Issue, pathKey, setAtPath, validatePlan } from '../lib/validate';
import { Plan, RepUnit, Reps, Weight, WeightUnit } from '../lib/types';
import { formatRepsForDisplay, formatSec } from '../lib/helpers';
import { formatWeight } from '../lib/format';
import { dayLetter } from '../lib/helpers';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ValidatePlan'>;
type R = RouteProp<RootStackParamList, 'ValidatePlan'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Walks the imported plan and shows every field as a read-only label,
 * EXCEPT those that failed validation: those become inline typed editors
 * with a subtle red outline. The user fixes them in place and tapping
 * "Salva e continua" persists the corrected plan + pushes to GitHub.
 */
export function ValidatePlanScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { palette, mode } = useTheme();
  const { settings, setPlan, syncNow, showToast, github } = useStore();

  const [current, setCurrent] = useState<Plan>(route.params.plan);
  const issues = useMemo(() => validatePlan(current), [current]);
  const byPath = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const i of issues) map.set(pathKey(i.path), i);
    return map;
  }, [issues]);

  const updateAt = (path: (string | number)[], value: unknown) => {
    setCurrent(prev => setAtPath(prev, path, value) as Plan);
  };

  const [busy, setBusy] = useState(false);
  const onSave = async () => {
    if (issues.length > 0) {
      showToast('Correggi prima tutti i campi in rosso');
      return;
    }
    setBusy(true);
    setPlan(current);
    if (github.token && github.repo) {
      const res = await syncNow({
        silent: false,
        markActive: true,
        message: `scheda: import ${current.nome_scheda ?? current.id}`,
      });
      if (!res.ok) {
        // We saved locally anyway, but warn
        showToast(`Salvata in locale (sync GitHub fallita: ${res.error})`);
      }
    } else {
      showToast('Scheda salvata in locale (GitHub non collegato)');
    }
    setBusy(false);
    navigation.navigate('Home');
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Verifica scheda</Text>
        <View style={{ width: 42 }} />
      </View>

      <View
        style={[
          styles.banner,
          {
            backgroundColor: issues.length === 0 ? palette.successSoft : palette.dangerSoft,
            borderColor:
              issues.length === 0
                ? hexToRgba(stripHash(palette.success), 0.45)
                : hexToRgba(stripHash(palette.danger), 0.45),
          },
        ]}
      >
        <Icon
          name={issues.length === 0 ? 'check' : 'pencil'}
          color={issues.length === 0 ? palette.success : palette.danger}
          size={18}
        />
        <Text
          style={[
            styles.bannerText,
            { color: issues.length === 0 ? palette.success : palette.danger },
          ]}
        >
          {issues.length === 0
            ? 'Tutto in regola — puoi salvare'
            : `${issues.length} ${issues.length === 1 ? 'campo' : 'campi'} da correggere`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 140 }}>
        <Text style={[styles.schedaName, { color: palette.text }]}>
          {current.nome_scheda || 'Scheda senza nome'}
        </Text>
        <Text style={[styles.schedaSub, { color: palette.textDim }]}>
          {current.giorni.length} {current.giorni.length === 1 ? 'giorno' : 'giorni'}  ·  id: {current.id}
        </Text>

        {current.giorni.map((day, gi) => (
          <GlassCard key={day.id || `g-${gi}`} style={styles.dayCard}>
            <View style={styles.dayHead}>
              <View
                style={[
                  styles.dayStub,
                  {
                    backgroundColor: hexToRgba(stripHash(day.colore ?? palette.accent), 0.22),
                    borderColor: hexToRgba(stripHash(day.colore ?? palette.accent), 0.55),
                  },
                ]}
              >
                <Text style={[styles.dayStubText, { color: day.colore ?? palette.accent }]}>
                  {dayLetter(gi)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.dayName, { color: palette.text }]}>{day.nome}</Text>
                {day.cardio && (
                  <Text style={[styles.dayMeta, { color: palette.textDim }]}>
                    + cardio {day.cardio.tipo}
                  </Text>
                )}
              </View>
            </View>

            {day.esercizi.map((ex, ei) => {
              const exPath = ['giorni', gi, 'esercizi', ei] as (string | number)[];
              const isSuper = ex.tipo === 'superset';
              return (
                <View
                  key={ex.id || `ex-${ei}`}
                  style={[styles.exBlock, { borderColor: palette.divider }]}
                >
                  <View style={styles.exHead}>
                    <Text style={[styles.exName, { color: palette.text }]} numberOfLines={2}>
                      {ei + 1}. {ex.nome}
                    </Text>
                    {isSuper && (
                      <View style={[styles.tag, { backgroundColor: palette.accentSoft }]}>
                        <Text style={[styles.tagText, { color: palette.accent }]}>SUPERSET</Text>
                      </View>
                    )}
                  </View>

                  {!isSuper && (
                    <>
                      <FieldRow
                        label="Serie"
                        path={[...exPath, 'serie']}
                        issue={byPath.get(pathKey([...exPath, 'serie']))}
                        currentValue={ex.serie}
                        renderValid={() => <Text style={{ color: palette.text }}>{ex.serie}</Text>}
                        renderEditor={(commit) => (
                          <NumberEditor
                            value={String(ex.serie ?? '')}
                            placeholder="es. 4"
                            onCommit={n => commit(n)}
                          />
                        )}
                      />
                      <FieldRow
                        label="Reps"
                        path={[...exPath, 'reps']}
                        issue={byPath.get(pathKey([...exPath, 'reps']))}
                        currentValue={ex.reps}
                        renderValid={() => (
                          <Text style={{ color: palette.text }}>
                            {formatRepsForDisplay(ex.reps)}
                          </Text>
                        )}
                        renderEditor={(commit) => (
                          <RepsEditor onCommit={commit} initial={ex.reps} raw={String(byPath.get(pathKey([...exPath, 'reps']))?.raw ?? '')} />
                        )}
                      />
                      <FieldRow
                        label="Peso scheda"
                        path={[...exPath, 'peso_suggerito']}
                        issue={byPath.get(pathKey([...exPath, 'peso_suggerito']))}
                        currentValue={ex.peso_suggerito}
                        renderValid={() => (
                          <Text style={{ color: palette.text }}>
                            {ex.peso_suggerito ? formatWeight(ex.peso_suggerito) : '—'}
                          </Text>
                        )}
                        renderEditor={(commit) => (
                          <WeightInlineEditor
                            defaultUnit={settings.defaultUnit}
                            initial={ex.peso_suggerito}
                            raw={String(byPath.get(pathKey([...exPath, 'peso_suggerito']))?.raw ?? '')}
                            onCommit={commit}
                          />
                        )}
                      />
                    </>
                  )}

                  <FieldRow
                    label="Recupero"
                    path={[...exPath, 'recupero_sec']}
                    issue={byPath.get(pathKey([...exPath, 'recupero_sec']))}
                    currentValue={ex.recupero_sec}
                    renderValid={() => (
                      <Text style={{ color: palette.text }}>{formatSec(ex.recupero_sec)}</Text>
                    )}
                    renderEditor={(commit) => (
                      <NumberEditor
                        value={String(ex.recupero_sec ?? '')}
                        placeholder="secondi"
                        onCommit={commit}
                      />
                    )}
                  />

                  {isSuper && ex.esercizi?.map((sub, si) => {
                    const subPath = [...exPath, 'esercizi', si] as (string | number)[];
                    return (
                      <View key={sub.id || `sub-${si}`} style={[styles.subBlock, { borderColor: palette.divider }]}>
                        <Text style={[styles.subName, { color: palette.textDim }]}>
                          ↳ {sub.nome}
                        </Text>
                        <FieldRow
                          label="Serie"
                          path={[...subPath, 'serie']}
                          issue={byPath.get(pathKey([...subPath, 'serie']))}
                          currentValue={sub.serie}
                          renderValid={() => <Text style={{ color: palette.text }}>{sub.serie}</Text>}
                          renderEditor={(commit) => (
                            <NumberEditor
                              value={String(sub.serie ?? '')}
                              placeholder="es. 3"
                              onCommit={commit}
                            />
                          )}
                        />
                        <FieldRow
                          label="Reps"
                          path={[...subPath, 'reps']}
                          issue={byPath.get(pathKey([...subPath, 'reps']))}
                          currentValue={sub.reps}
                          renderValid={() => (
                            <Text style={{ color: palette.text }}>
                              {formatRepsForDisplay(sub.reps)}
                            </Text>
                          )}
                          renderEditor={(commit) => (
                            <RepsEditor
                              onCommit={commit}
                              initial={sub.reps}
                              raw={String(byPath.get(pathKey([...subPath, 'reps']))?.raw ?? '')}
                            />
                          )}
                        />
                        <FieldRow
                          label="Peso"
                          path={[...subPath, 'peso_suggerito']}
                          issue={byPath.get(pathKey([...subPath, 'peso_suggerito']))}
                          currentValue={sub.peso_suggerito}
                          renderValid={() => (
                            <Text style={{ color: palette.text }}>
                              {sub.peso_suggerito ? formatWeight(sub.peso_suggerito) : '—'}
                            </Text>
                          )}
                          renderEditor={(commit) => (
                            <WeightInlineEditor
                              defaultUnit={settings.defaultUnit}
                              initial={sub.peso_suggerito}
                              raw={String(byPath.get(pathKey([...subPath, 'peso_suggerito']))?.raw ?? '')}
                              onCommit={commit}
                            />
                          )}
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </GlassCard>
        ))}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: mode === 'dark' ? 'rgba(8,8,10,0.88)' : 'rgba(255,255,255,0.92)',
            borderTopColor: palette.glassBorder,
          },
        ]}
      >
        <GlassButton
          title={busy ? 'Salvataggio…' : github.token ? 'Salva e sincronizza' : 'Salva in locale'}
          icon="check"
          onPress={onSave}
          disabled={busy || issues.length > 0}
          block
          size="lg"
        />
      </View>

      {/* Bridge prop for the editor commit callback */}
      <_Bridge updateAt={updateAt} />
    </Screen>
  );
}

/**
 * Tiny invisible component that exposes updateAt via a static — keeps the
 * FieldRow API clean (no prop drilling through 4 layers). We don't need
 * anything fancier given the tree depth.
 */
const _Bridge = ({ updateAt }: { updateAt: (path: (string | number)[], value: unknown) => void }) => {
  _commit = updateAt;
  return null;
};
let _commit: (path: (string | number)[], value: unknown) => void = () => {};

/* ============================================================
 *  Field row — read-only label, or red-outlined editor on error
 * ============================================================ */

function FieldRow({
  label,
  path,
  issue,
  renderValid,
  renderEditor,
}: {
  label: string;
  path: (string | number)[];
  issue?: Issue;
  currentValue: unknown;
  renderValid: () => React.ReactNode;
  renderEditor: (commit: (val: unknown) => void) => React.ReactNode;
}) {
  const { palette } = useTheme();
  const broken = !!issue;

  return (
    <View style={[fieldStyles.row, broken && fieldStyles.rowBroken]}>
      <Text style={[fieldStyles.label, { color: palette.textDim }]}>{label}</Text>
      <View style={fieldStyles.valueWrap}>
        {!broken ? (
          renderValid()
        ) : (
          <View
            style={[
              fieldStyles.editorBox,
              {
                borderColor: hexToRgba(stripHash(palette.danger), 0.65),
                backgroundColor: hexToRgba(stripHash(palette.danger), 0.06),
              },
            ]}
          >
            {renderEditor(val => _commit(path, val))}
            {issue && (
              <Text style={[fieldStyles.issueText, { color: palette.danger }]}>
                {issue.message}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/* ============================================================
 *  Inline editors
 * ============================================================ */

function NumberEditor({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (n: number) => void;
}) {
  const { palette } = useTheme();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        const n = parseInt(text.replace(/[^\d-]/g, ''), 10);
        if (Number.isFinite(n) && n > 0) onCommit(n);
      }}
      placeholder={placeholder}
      placeholderTextColor={palette.textFaint}
      keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
      style={[inlineStyles.input, { color: palette.text }]}
    />
  );
}

function RepsEditor({
  initial,
  raw,
  onCommit,
}: {
  initial?: Reps;
  raw?: string;
  onCommit: (r: Reps) => void;
}) {
  const { palette } = useTheme();
  const [unit, setUnit] = useState<RepUnit>(initial?.unit ?? 'times');
  const [amrap, setAmrap] = useState<boolean>(initial ? initial.value == null : false);
  const [val, setVal] = useState<string>(initial?.value != null ? String(initial.value) : '');

  const tryCommit = (u: RepUnit, isAmrap: boolean, v: string) => {
    if (isAmrap) {
      onCommit({ value: null, unit: u });
      return;
    }
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n > 0) onCommit({ value: n, unit: u });
  };

  const units: { u: RepUnit; label: string }[] = [
    { u: 'times', label: 'Volte' },
    { u: 'seconds', label: 'Secondi' },
    { u: 'minutes', label: 'Minuti' },
  ];

  return (
    <View>
      <View style={inlineStyles.segmented}>
        {units.map(({ u, label }) => {
          const active = u === unit && !amrap;
          return (
            <Pressable
              key={u}
              onPress={() => {
                setUnit(u);
                setAmrap(false);
                tryCommit(u, false, val);
              }}
              style={[inlineStyles.segItem, { backgroundColor: active ? palette.accent : 'transparent' }]}
            >
              <Text style={[inlineStyles.segText, { color: active ? '#fff' : palette.text }]}>{label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            setAmrap(true);
            tryCommit(unit, true, val);
          }}
          style={[inlineStyles.segItem, { backgroundColor: amrap ? palette.accent : 'transparent' }]}
        >
          <Text style={[inlineStyles.segText, { color: amrap ? '#fff' : palette.text }]}>AMRAP</Text>
        </Pressable>
      </View>
      {!amrap && (
        <TextInput
          value={val}
          onChangeText={t => {
            const clean = t.replace(/[^0-9]/g, '');
            setVal(clean);
            tryCommit(unit, false, clean);
          }}
          placeholder={unit === 'times' ? 'numero' : unit === 'seconds' ? 'secondi' : 'minuti'}
          placeholderTextColor={palette.textFaint}
          keyboardType="number-pad"
          style={[inlineStyles.input, { color: palette.text, marginTop: 6 }]}
        />
      )}
      {raw && (
        <Text style={[inlineStyles.raw, { color: palette.textFaint }]}>
          originale: "{raw}"
        </Text>
      )}
    </View>
  );
}

function WeightInlineEditor({
  initial,
  raw,
  defaultUnit,
  onCommit,
}: {
  initial?: Weight;
  raw?: string;
  defaultUnit: WeightUnit;
  onCommit: (w: Weight) => void;
}) {
  const { palette } = useTheme();
  const [unit, setUnit] = useState<WeightUnit>(initial?.unit ?? defaultUnit);
  const [text, setText] = useState<string>(
    initial?.value != null ? String(initial.value) : ''
  );

  const tryCommit = (val: string, u: WeightUnit) => {
    const n = parseFloat(val.replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) onCommit({ value: n, unit: u });
  };

  return (
    <View>
      <View style={inlineStyles.segmented}>
        {(['kg', 'lb', 'bw'] as WeightUnit[]).map(u => {
          const active = u === unit;
          return (
            <Pressable
              key={u}
              onPress={() => {
                setUnit(u);
                tryCommit(text || '0', u);
              }}
              style={[
                inlineStyles.segItem,
                { backgroundColor: active ? palette.accent : 'transparent' },
              ]}
            >
              <Text style={[inlineStyles.segText, { color: active ? '#fff' : palette.text }]}>
                {u === 'bw' ? 'corpo libero' : u}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={text}
        onChangeText={t => {
          setText(t);
          tryCommit(t, unit);
        }}
        placeholder={unit === 'bw' ? '0 (zavorra)' : 'es. 40'}
        placeholderTextColor={palette.textFaint}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        style={[inlineStyles.input, { color: palette.text, marginTop: 6 }]}
      />
      {raw && (
        <Text style={[inlineStyles.raw, { color: palette.textFaint }]}>
          originale: "{raw}"
        </Text>
      )}
    </View>
  );
}

/* ============================================================
 *  Styles
 * ============================================================ */

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: { ...typography.title2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    marginHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  bannerText: { ...typography.footnote, fontWeight: '700', flex: 1 },
  schedaName: { ...typography.largeTitle, marginBottom: 4 },
  schedaSub: { ...typography.footnote, marginBottom: space.md },
  dayCard: { padding: space.md, marginBottom: space.md },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.sm },
  dayStub: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  dayStubText: { ...typography.title3, fontWeight: '800' },
  dayName: { ...typography.headline },
  dayMeta: { ...typography.caption1, marginTop: 2 },
  exBlock: {
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  exName: { ...typography.callout, fontWeight: '700', flex: 1 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: { ...typography.caption2, letterSpacing: 0.5 },
  subBlock: {
    marginTop: 8,
    paddingTop: 8,
    paddingLeft: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subName: { ...typography.footnote, fontWeight: '700', marginBottom: 4 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
  },
});

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  rowBroken: {
    paddingVertical: 8,
  },
  label: {
    ...typography.footnote,
    fontWeight: '600',
    width: 90,
  },
  valueWrap: { flex: 1, minWidth: 0 },
  editorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    gap: 4,
  },
  issueText: {
    ...typography.caption1,
    marginTop: 4,
  },
});

const inlineStyles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(127,127,127,0.3)',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    gap: 4,
  },
  segItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(127,127,127,0.3)',
  },
  segText: { ...typography.caption1, fontWeight: '700' },
  raw: {
    ...typography.caption2,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
