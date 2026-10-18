/**
 * Review of a plan coming from an AI answer or a file, before saving it.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDraft } from '../../data/draft';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Empty } from '../../ui/Empty';
import { TextField } from '../../ui/TextField';
import { Row, Section } from '../../ui/List';
import { toast } from '../../ui/Toast';
import { ExerciseRow } from '../components/ExerciseRow';
import { DayBadge } from '../components/DayBadge';
import { ScreenProps } from '../../navigation/types';
import { Plan } from '../../core/types';
import { plural } from '../../core/format';

/** Keep the old day ids when names match, so "last done" info survives a modify. */
const carryDayIds = (next: Plan, old: Plan): Plan => ({
  ...next,
  id: old.id,
  createdAt: old.createdAt,
  days: next.days.map((d, i) => {
    const same =
      old.days.find(
        o => o.name.trim().toLowerCase() === d.name.trim().toLowerCase(),
      ) ?? old.days[i];
    return same && !next.days.some((x, j) => j < i && x.id === same.id)
      ? { ...d, id: same.id }
      : d;
  }),
});

export function ImportReviewScreen({
  navigation,
}: ScreenProps<'ImportReview'>) {
  const { c } = useTheme();
  const parsed = useDraft(s => s.parsed);
  const replacesId = useDraft(s => s.replacesPlanId);
  const old = useStore(s => s.plans.find(p => p.id === replacesId));
  const addPlan = useStore(s => s.addPlan);
  const savePlan = useStore(s => s.savePlan);
  const importSessions = useStore(s => s.importSessions);
  const completeOnboarding = useStore(s => s.completeOnboarding);
  const [name, setName] = useState(parsed?.plan.name ?? '');
  const [withHistory, setWithHistory] = useState(true);

  if (!parsed) {
    return (
      <Screen title="Importa" back>
        <Empty icon="doc" title="Niente da importare" />
      </Screen>
    );
  }

  const plan: Plan = { ...parsed.plan, name: name.trim() || parsed.plan.name };
  const exercises = plan.days.reduce(
    (n, d) => n + d.blocks.reduce((m, b) => m + b.exercises.length, 0),
    0,
  );

  const finish = (mode: 'new' | 'replace') => {
    if (mode === 'replace' && old) savePlan(carryDayIds(plan, old));
    else addPlan(plan);
    if (withHistory && parsed.sessions.length) {
      importSessions(
        parsed.sessions.map(s => ({
          ...s,
          planId: plan.id,
          planName: plan.name,
        })),
      );
    }
    completeOnboarding();
    useDraft.setState({ parsed: null, replacesPlanId: null });
    toast(mode === 'replace' ? 'Scheda aggiornata' : 'Scheda salvata');
    navigation.popToTop();
  };

  const edit = () => {
    useDraft.setState({ editing: old ? carryDayIds(plan, old) : plan });
    navigation.navigate('PlanEditor');
  };

  return (
    <Screen
      title="Controlla la scheda"
      back
      keyboard
      footer={
        <View style={styles.footer}>
          {old ? (
            <Button
              title={`Sostituisci «${old.name}»`}
              icon="refresh"
              onPress={() => finish('replace')}
            />
          ) : null}
          <Button
            title={old ? 'Salva come nuova' : 'Salva e usa questa scheda'}
            icon="check"
            variant={old ? 'glass' : 'prominent'}
            onPress={() => finish('new')}
          />
        </View>
      }
      bottomSpace={old ? 60 : 0}
    >
      <TextField label="Nome" value={name} onChangeText={setName} />

      <View style={styles.summary}>
        <T v="subhead" color="secondary">
          {plural(plan.days.length, 'giorno', 'giorni')} ·{' '}
          {plural(exercises, 'esercizio', 'esercizi')}
        </T>
        <Button
          title="Modifica"
          icon="pencil"
          size="s"
          variant="tinted"
          onPress={edit}
        />
      </View>

      {parsed.warnings.length ? (
        <Card style={styles.block}>
          <View style={styles.warnHead}>
            <Icon name="info" size={18} color={c.orange} />
            <T v="headline">Da controllare</T>
          </View>
          {parsed.warnings.slice(0, 12).map((w, i) => (
            <T key={i} v="footnote" color="secondary" style={styles.warn}>
              • {w}
            </T>
          ))}
          {parsed.warnings.length > 12 ? (
            <T v="footnote" color="tertiary" style={styles.warn}>
              …e altri {parsed.warnings.length - 12}
            </T>
          ) : null}
        </Card>
      ) : null}

      {parsed.unmatched ? (
        <Card style={styles.block}>
          <T v="subhead" color="secondary">
            {plural(parsed.unmatched, 'esercizio non ha', 'esercizi non hanno')}{' '}
            un'animazione collegata. Puoi collegarli dall'editor (Modifica).
          </T>
        </Card>
      ) : null}

      {parsed.sessions.length ? (
        <Section>
          <Row
            title={`Importa anche ${plural(
              parsed.sessions.length,
              'allenamento',
              'allenamenti',
            )}`}
            subtitle="Storico presente nel file"
            toggle={{ value: withHistory, onChange: setWithHistory }}
          />
        </Section>
      ) : null}

      {plan.days.map((d, i) => (
        <Card key={d.id} style={styles.block}>
          <View style={styles.dayHead}>
            <DayBadge index={i} size={36} />
            <T v="headline" style={styles.flex} numberOfLines={2}>
              {d.name}
            </T>
          </View>
          {d.blocks.map(b => (
            <View
              key={b.id}
              style={
                b.exercises.length > 1
                  ? [styles.superset, { borderColor: c.accent }]
                  : undefined
              }
            >
              {b.exercises.map(ex => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  showRest={b.exercises.length === 1}
                />
              ))}
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 8 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  block: { marginBottom: 12 },
  warnHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warn: { marginTop: 4 },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  flex: { flex: 1 },
  superset: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginVertical: 4,
    borderRadius: 2,
  },
});
