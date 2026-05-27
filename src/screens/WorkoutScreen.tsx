import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { ProgressRing } from '../components/ProgressRing';
import { ExerciseCard } from '../components/ExerciseCard';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { GlassButton } from '../components/GlassButton';
import { WeightEditor } from '../components/WeightEditor';
import {
  dayLetter,
  findExercise,
  getSerieFatte,
  getSerieTotali,
  isCompletato,
  stripDayLetterPrefix,
} from '../lib/helpers';
import { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Weight } from '../lib/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Workout'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function WorkoutScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { palette, mode } = useTheme();
  const {
    plan,
    currentDayId,
    setCurrentDayId,
    toggleSet,
    setNote,
    setWeightForSet,
    startExerciseTimer,
    timer,
    finishWorkout,
    settings,
  } = useStore();

  const [weightModal, setWeightModal] = useState<{
    exId: string;
    subId: string | null;
    setIdx: number;
    name: string;
    suggested?: Weight;
    current: Weight | null;
  } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [celebration, setCelebration] = useState(false);

  const day = useMemo(() => plan?.giorni.find(g => g.id === currentDayId) ?? null, [plan, currentDayId]);
  const dayIdx = plan?.giorni.findIndex(g => g.id === currentDayId) ?? 0;

  if (!plan || !day) {
    return (
      <Screen>
        <View style={{ padding: space.lg }}>
          <GlassButton
            title="Torna alla Home"
            icon="arrow-left"
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </Screen>
    );
  }

  const accent = day.colore ?? palette.accent;
  const totalEx = day.esercizi.length;
  const doneEx = day.esercizi.filter(isCompletato).length;
  const totalSets = day.esercizi.reduce((s, e) => s + getSerieTotali(e), 0);
  const doneSets = day.esercizi.reduce((s, e) => s + getSerieFatte(e), 0);
  const progress = totalEx > 0 ? doneEx / totalEx : 0;

  const goHome = () => {
    setCurrentDayId(null);
    navigation.navigate('Home');
  };

  const openWeight = (exId: string, subId: string | null, setIdx: number) => {
    const ex = findExercise(plan, exId);
    if (!ex) return;
    const target = subId ? ex.esercizi?.find(s => s.id === subId) : ex;
    if (!target) return;
    const current = (target._pesi_serie ?? [])[setIdx] ?? null;
    setWeightModal({
      exId,
      subId,
      setIdx,
      name: subId ? target.nome : ex.nome,
      suggested: target.peso_suggerito,
      current,
    });
  };

  const saveWeight = (w: Weight | null) => {
    if (!weightModal) return;
    setWeightForSet(weightModal.exId, weightModal.subId, weightModal.setIdx, w);
    setWeightModal(null);
  };

  const onFinishConfirmed = () => {
    setSummaryOpen(false);
    const session = finishWorkout();
    if (session) {
      setCelebration(true);
    }
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={goHome} size={42} variant="glass" />
        <View style={{ flex: 1, marginHorizontal: 12, minWidth: 0 }}>
          <Text style={[styles.dayLabel, { color: palette.textDim }]} numberOfLines={1}>
            Giorno {dayLetter(dayIdx)}
          </Text>
          <Text style={[styles.dayName, { color: palette.text }]} numberOfLines={1}>
            {stripDayLetterPrefix(day.nome)}
          </Text>
        </View>
        <ProgressRing progress={progress} size={48} thickness={4} color={accent}>
          <Text style={[styles.progressLabel, { color: palette.text }]}>
            {doneEx}/{totalEx}
          </Text>
        </ProgressRing>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: 120 + insets.bottom,
          paddingTop: space.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        {day.esercizi.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            num={i + 1}
            tint={accent}
            timer={timer}
            onToggleSet={idx => toggleSet(ex.id, idx)}
            onChangeNote={v => setNote(ex.id, v)}
            onEditWeight={(subId, idx) => openWeight(ex.id, subId, idx)}
            onStartTimer={() => startExerciseTimer(ex.id)}
          />
        ))}

        {day.cardio && (
          <GlassCard rounded="lg" style={styles.cardio}>
            <View style={styles.cardioHead}>
              <Icon name="timer" color={accent} size={14} />
              <Text style={[styles.cardioLabel, { color: palette.textDim }]}>
                CARDIO FINALE
              </Text>
            </View>
            <Text style={[styles.cardioTitle, { color: palette.text }]}>{day.cardio.tipo}</Text>
            <Text style={[styles.cardioMeta, { color: palette.textDim }]}>
              {day.cardio.durata_min} minuti
            </Text>
            {day.cardio.modalita && (
              <Text style={[styles.cardioMode, { color: palette.textFaint }]}>{day.cardio.modalita}</Text>
            )}
          </GlassCard>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 10,
            backgroundColor: mode === 'dark' ? 'rgba(8,8,10,0.78)' : 'rgba(255,255,255,0.86)',
            borderTopColor: palette.glassBorder,
          },
        ]}
      >
        <View style={styles.bottomInner}>
          <GlassButton
            title="Riepilogo"
            icon="list"
            variant="secondary"
            onPress={() => setSummaryOpen(true)}
            style={{ flex: 1 }}
          />
          <GlassButton
            title="Fine"
            icon="check"
            onPress={() => setSummaryOpen(true)}
            tint={accent}
            style={{ flex: 1 }}
            disabled={doneSets === 0}
          />
        </View>
      </View>

      {/* Typed weight editor */}
      <WeightEditor
        visible={!!weightModal}
        exerciseName={weightModal?.name ?? ''}
        setNumber={(weightModal?.setIdx ?? 0) + 1}
        suggested={weightModal?.suggested}
        current={weightModal?.current ?? null}
        defaultUnit={settings.defaultUnit}
        onCancel={() => setWeightModal(null)}
        onSave={saveWeight}
      />

      {/* Summary / Finish confirmation modal */}
      <Modal
        transparent
        visible={summaryOpen}
        animationType="fade"
        onRequestClose={() => setSummaryOpen(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalBg, { backgroundColor: palette.scrim }]}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: mode === 'dark' ? 'rgba(20,20,24,0.97)' : 'rgba(252,252,255,0.98)',
                borderColor: palette.glassBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: palette.dividerStrong }]} />
            <Text style={[styles.summaryTitle, { color: palette.text }]}>Fine allenamento?</Text>
            <View style={[styles.summaryStat, { borderColor: palette.glassBorder, backgroundColor: palette.surface }]}>
              <View>
                <Text style={[styles.summaryStatLabel, { color: palette.textDim }]}>Esercizi</Text>
                <Text style={[styles.summaryStatValue, { color: palette.text }]}>
                  {doneEx}/{totalEx}
                </Text>
              </View>
              <View
                style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.divider }}
              />
              <View>
                <Text style={[styles.summaryStatLabel, { color: palette.textDim }]}>Serie</Text>
                <Text style={[styles.summaryStatValue, { color: palette.text }]}>
                  {doneSets}/{totalSets}
                </Text>
              </View>
              <View
                style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: palette.divider }}
              />
              <View>
                <Text style={[styles.summaryStatLabel, { color: palette.textDim }]}>Completato</Text>
                <Text style={[styles.summaryStatValue, { color: accent }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingVertical: 8 }}>
              {day.esercizi.map(ex => {
                const tot = getSerieTotali(ex);
                const fatte = getSerieFatte(ex);
                const completato = isCompletato(ex);
                const stato = ex._serie_stato ?? [];
                return (
                  <View key={ex.id} style={[styles.sumRow, { borderColor: palette.glassBorder }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.sumName,
                          { color: completato ? palette.text : palette.textDim },
                        ]}
                        numberOfLines={1}
                      >
                        {completato ? '✓ ' : ''}{ex.nome}
                      </Text>
                      <View style={styles.sumDots}>
                        {Array.from({ length: tot }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.sumDot,
                              {
                                backgroundColor: stato[i]
                                  ? accent
                                  : palette.dividerStrong,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={[styles.sumStat, { color: palette.textDim }]}>
                      {fatte}/{tot}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            <Text style={[styles.summaryHint, { color: palette.textFaint }]}>
              Le serie non completate non contano per i pesi salvati.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <GlassButton
                title="Annulla"
                variant="secondary"
                onPress={() => setSummaryOpen(false)}
                block
                style={{ flex: 1 }}
              />
              <GlassButton
                title="Conferma fine"
                tint={accent}
                onPress={onFinishConfirmed}
                block
                style={{ flex: 1 }}
                disabled={doneSets === 0}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Celebration */}
      <Modal
        transparent
        visible={celebration}
        animationType="fade"
        onRequestClose={() => {
          setCelebration(false);
          goHome();
        }}
        statusBarTranslucent
      >
        <View style={[styles.modalBg, { backgroundColor: palette.scrim }]}>
          <View
            style={[
              styles.celebration,
              {
                backgroundColor: mode === 'dark' ? 'rgba(22,22,28,0.98)' : 'rgba(255,255,255,0.99)',
                borderColor: hexToRgba(stripHash(accent), 0.5),
                shadowColor: accent,
              },
            ]}
          >
            <View
              style={[
                styles.celIcon,
                {
                  backgroundColor: hexToRgba(stripHash(accent), 0.18),
                  borderColor: hexToRgba(stripHash(accent), 0.5),
                },
              ]}
            >
              <Icon name="trophy" color={accent} size={36} />
            </View>
            <Text style={[styles.celTitle, { color: palette.text }]}>Fatto!</Text>
            <Text style={[styles.celSub, { color: palette.textDim }]}>
              {day.nome} completato. Gran lavoro.
            </Text>
            <View style={{ marginTop: space.lg, gap: 10, alignSelf: 'stretch' }}>
              <GlassButton
                title="Continua"
                tint={accent}
                onPress={() => {
                  setCelebration(false);
                  goHome();
                }}
                block
                icon="check"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  dayLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayName: {
    ...typography.title2,
    marginTop: 1,
  },
  progressLabel: {
    ...typography.caption2,
    fontWeight: '800',
  },
  cardio: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  cardioHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardioLabel: {
    ...typography.caption2,
    letterSpacing: 0.6,
  },
  cardioTitle: {
    ...typography.title3,
    marginTop: 6,
  },
  cardioMeta: {
    ...typography.subhead,
    marginTop: 2,
  },
  cardioMode: {
    ...typography.footnote,
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: space.lg,
    paddingTop: 12,
  },
  bottomInner: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.lg,
  },
  modalTitle: {
    ...typography.title2,
    marginBottom: 6,
  },
  modalSub: {
    ...typography.footnote,
    marginBottom: space.md,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalHint: {
    ...typography.caption1,
    marginBottom: space.md,
  },
  summaryCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: space.lg,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  summaryTitle: {
    ...typography.title2,
    marginBottom: 12,
  },
  summaryStat: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryStatLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryStatValue: {
    ...typography.title3,
    marginTop: 2,
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sumName: {
    ...typography.callout,
    fontWeight: '600',
  },
  sumDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  sumDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sumStat: {
    ...typography.mono,
    fontWeight: '700',
  },
  summaryHint: {
    ...typography.caption1,
    textAlign: 'center',
    marginTop: 10,
  },
  celebration: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl + 4,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.xl,
    alignItems: 'center',
    shadowOpacity: 0.55,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  celIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: 14,
  },
  celTitle: {
    ...typography.largeTitle,
  },
  celSub: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 4,
  },
});
