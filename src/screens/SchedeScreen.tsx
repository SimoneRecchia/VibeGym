import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { formatTimeAgo } from '../lib/helpers';
import { Plan } from '../lib/types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Schede'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

function schedaStats(p: Plan) {
  const sessioni = p.storico?.length ?? 0;
  const last = sessioni ? p.storico[p.storico.length - 1] : null;
  return { giorni: p.giorni.length, sessioni, last };
}

export function SchedeScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { plans, activeSchedaId, setActiveScheda, deleteScheda } = useStore();
  const [toDelete, setToDelete] = useState<Plan | null>(null);

  // Active first, then most-recently-used.
  const ordered = useMemo(() => {
    const copy = [...plans];
    copy.sort((a, b) => {
      if (a.id === activeSchedaId) return -1;
      if (b.id === activeSchedaId) return 1;
      const la = a.storico?.[a.storico.length - 1]?.data ?? '';
      const lb = b.storico?.[b.storico.length - 1]?.data ?? '';
      return lb.localeCompare(la);
    });
    return copy;
  }, [plans, activeSchedaId]);

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Le tue schede</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        {ordered.length === 0 ? (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
              ]}
            >
              <Icon name="layers" color={palette.accent} size={28} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>Ancora nessuna scheda</Text>
            <Text style={[styles.emptySub, { color: palette.textDim }]}>
              Aggiungi la tua prima scheda: le altre resteranno qui quando ne aggiungerai di nuove.
            </Text>
          </View>
        ) : (
          ordered.map(p => {
            const active = p.id === activeSchedaId;
            const { giorni, sessioni, last } = schedaStats(p);
            const accent = p.giorni[0]?.colore ?? palette.accent;
            return (
              <GlassCard key={p.id} style={styles.card}>
                <PressableScale
                  onPress={() => !active && setActiveScheda(p.id)}
                  disabled={active}
                >
                  <View style={styles.cardHead}>
                    <View
                      style={[
                        styles.stub,
                        {
                          backgroundColor: hexToRgba(stripHash(accent), 0.22),
                          borderColor: hexToRgba(stripHash(accent), 0.55),
                        },
                      ]}
                    >
                      <Text style={[styles.stubText, { color: stripHash(accent) }]}>
                        {(p.nome_scheda ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                        {p.nome_scheda ?? p.id}
                      </Text>
                      <Text style={[styles.meta, { color: palette.textDim }]} numberOfLines={1}>
                        {giorni} {giorni === 1 ? 'giorno' : 'giorni'} · {sessioni}{' '}
                        {sessioni === 1 ? 'sessione' : 'sessioni'}
                        {last ? ` · ${formatTimeAgo(new Date(last.data))}` : ''}
                      </Text>
                    </View>
                    {active ? (
                      <View style={[styles.badge, { backgroundColor: palette.successSoft, borderColor: hexToRgba(stripHash(palette.success), 0.5) }]}>
                        <Text style={[styles.badgeText, { color: palette.success }]}>ATTIVA</Text>
                      </View>
                    ) : (
                      <Icon name="chevron-right" color={palette.textFaint} size={20} />
                    )}
                  </View>
                </PressableScale>

                <View style={[styles.actions, { borderTopColor: palette.divider }]}>
                  {!active && (
                    <GlassButton
                      title="Rendi attiva"
                      icon="check"
                      variant="secondary"
                      size="sm"
                      onPress={() => setActiveScheda(p.id)}
                      style={{ flex: 1 }}
                    />
                  )}
                  <GlassButton
                    title="Progressione"
                    icon="chart"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      if (!active) setActiveScheda(p.id);
                      navigation.navigate('Charts');
                    }}
                    style={{ flex: 1 }}
                  />
                  <GlassButton
                    title="Elimina"
                    icon="trash"
                    variant="danger"
                    size="sm"
                    onPress={() => setToDelete(p)}
                    style={{ flex: 1 }}
                  />
                </View>
              </GlassCard>
            );
          })
        )}

        <GlassButton
          title="Aggiungi scheda"
          icon="plus"
          onPress={() => navigation.navigate('PlanWizard')}
          block
          size="lg"
          style={{ marginTop: space.lg }}
        />
      </ScrollView>

      <Modal
        transparent
        visible={!!toDelete}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setToDelete(null)}
      >
        <View style={[styles.modalBg, { backgroundColor: palette.scrim }]}>
          <View
            style={[
              styles.confirm,
              { backgroundColor: palette.surfaceSolid, borderColor: palette.glassBorder },
            ]}
          >
            <Text style={[styles.confirmTitle, { color: palette.text }]}>Eliminare la scheda?</Text>
            <Text style={[styles.confirmBody, { color: palette.textDim }]}>
              «{toDelete?.nome_scheda ?? toDelete?.id}» verrà rimossa da questo dispositivo, con il suo
              storico. Le altre schede restano.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassButton
                title="Annulla"
                variant="secondary"
                onPress={() => setToDelete(null)}
                block
                style={{ flex: 1 }}
              />
              <GlassButton
                title="Elimina"
                variant="danger"
                onPress={() => {
                  if (toDelete) deleteScheda(toDelete.id);
                  setToDelete(null);
                }}
                block
                style={{ flex: 1 }}
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
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: { ...typography.title2 },
  card: { padding: space.md, marginBottom: 12, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stub: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stubText: { ...typography.title3, fontWeight: '800' },
  name: { ...typography.headline },
  meta: { ...typography.footnote, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  badgeText: { ...typography.caption2, letterSpacing: 0.5 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  empty: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.xxl },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: space.lg,
  },
  emptyTitle: { ...typography.title2 },
  emptySub: { ...typography.body, textAlign: 'center', marginTop: 6 },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  confirm: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.lg,
  },
  confirmTitle: { ...typography.title2, marginBottom: 6 },
  confirmBody: { ...typography.body, marginBottom: space.md },
});
