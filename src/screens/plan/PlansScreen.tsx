import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../data/store';
import { useDraft } from '../../data/draft';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Empty } from '../../ui/Empty';
import { showMenu } from '../../ui/Menu';
import { toast } from '../../ui/Toast';
import { fmtDate, fmtRelativeDay, plural } from '../../core/format';
import { planToJson } from '../../plan/aiFormat';
import { shareJson } from '../../services/files';
import { slugify } from '../../core/ids';
import { Nav } from '../../navigation/types';

/** Library of plans ("Le mie schede"). */
export function PlansScreen() {
  const nav = useNavigation<Nav>();
  const { c } = useTheme();
  const plans = useStore(s => s.plans);
  const activeId = useStore(s => s.activePlanId);
  const sessions = useStore(s => s.sessions);
  const setActive = useStore(s => s.setActivePlan);
  const duplicate = useStore(s => s.duplicatePlan);
  const remove = useStore(s => s.deletePlan);

  const menu = (id: string) => {
    const p = plans.find(x => x.id === id);
    if (!p) return;
    showMenu({
      title: p.name,
      options: [
        ...(id !== activeId
          ? [{ label: 'Usa questa scheda', onPress: () => setActive(id) }]
          : []),
        {
          label: 'Modifica',
          onPress: () => {
            useDraft.setState({ editing: JSON.parse(JSON.stringify(p)) });
            nav.navigate('PlanEditor');
          },
        },
        {
          label: "Modifica con l'AI",
          onPress: () => {
            setActive(id);
            nav.navigate('AiFlow', { mode: 'modify' });
          },
        },
        { label: 'Duplica', onPress: () => duplicate(id) },
        {
          label: 'Esporta (JSON)',
          onPress: () =>
            shareJson(
              `${slugify(p.name) || 'scheda'}.json`,
              planToJson(p),
            ).catch(() => {}),
        },
        {
          label: 'Elimina',
          destructive: true,
          onPress: () =>
            Alert.alert(
              `Eliminare «${p.name}»?`,
              'Lo storico degli allenamenti e i progressi restano.',
              [
                { text: 'Annulla', style: 'cancel' },
                {
                  text: 'Elimina',
                  style: 'destructive',
                  onPress: () => remove(id),
                },
              ],
            ),
        },
      ],
    });
  };

  return (
    <Screen
      title="Le mie schede"
      back={nav.canGoBack()}
      right={
        <IconButton
          plain
          icon="plus"
          onPress={() => nav.navigate('PlanSetup')}
          accessibilityLabel="Nuova scheda"
        />
      }
    >
      {!plans.length ? (
        <Card>
          <Empty
            icon="layers"
            title="Nessuna scheda"
            text="Crea la tua prima scheda: con l'AI ci vogliono un paio di minuti."
          >
            <Button
              title="Nuova scheda"
              icon="plus"
              onPress={() => nav.navigate('PlanSetup')}
            />
          </Empty>
        </Card>
      ) : null}
      {plans.map(p => {
        const active = p.id === activeId;
        const last = [...sessions].reverse().find(s => s.planId === p.id);
        return (
          <Card
            key={p.id}
            style={styles.card}
            onPress={() => {
              if (!active) {
                setActive(p.id);
                toast(`Ora usi «${p.name}»`);
              }
            }}
            onLongPress={() => menu(p.id)}
            accessibilityLabel={p.name}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.check,
                  active
                    ? { backgroundColor: c.accent }
                    : [styles.ring, { borderColor: c.tertiary }],
                ]}
              >
                {active ? (
                  <Icon name="check" size={16} color={c.onAccent} weight={3} />
                ) : null}
              </View>
              <View style={styles.flex}>
                <T v="headline" numberOfLines={1}>
                  {p.name}
                </T>
                <T v="footnote" color="secondary" numberOfLines={1}>
                  {plural(p.days.length, 'giorno', 'giorni')} · creata il{' '}
                  {fmtDate(p.createdAt)}
                  {last
                    ? ` · ultima volta ${fmtRelativeDay(last.startedAt)}`
                    : ''}
                </T>
              </View>
              <IconButton
                plain
                icon="ellipsis"
                size={36}
                onPress={() => menu(p.id)}
                accessibilityLabel={`Opzioni ${p.name}`}
              />
            </View>
          </Card>
        );
      })}
      {plans.length ? (
        <T v="footnote" color="secondary" align="center" style={styles.tip}>
          Tocca una scheda per usarla. Lo storico e i progressi sono condivisi
          tra tutte le schede.
        </T>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { borderWidth: 2 },
  flex: { flex: 1, minWidth: 0 },
  tip: { marginTop: 10, paddingHorizontal: 16 },
});
