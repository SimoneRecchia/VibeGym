import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Sparkline } from '../components/Sparkline';
import { ProfileFields } from '../components/ProfileFields';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

const W = Dimensions.get('window').width - space.lg * 2 - space.md * 2;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { profile, bodyLog, logWeight, backend, showToast } = useStore();

  const weights = bodyLog.filter(e => typeof e.weightKg === 'number') as { date: string; weightKg: number }[];
  const latest = weights[weights.length - 1]?.weightKg;
  const first = weights[0]?.weightKg;
  const delta = latest != null && first != null ? latest - first : null;

  const registerToday = () => {
    if (profile.weightKg == null) {
      showToast('Inserisci prima il peso qui sopra');
      return;
    }
    logWeight(profile.weightKg);
    showToast('Peso registrato');
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Profilo</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <Text style={[styles.intro, { color: palette.textDim }]}>
          {backend === 'cloud'
            ? 'Salvati con la tua scheda sul cloud. Tutti i campi sono opzionali.'
            : 'Restano su questo telefono. Tutti i campi sono opzionali.'}
        </Text>

        <ProfileFields />

        {/* -------------------- Weight trend -------------------- */}
        <Text style={[styles.sectionLabel, { color: palette.textFaint }]}>ANDAMENTO PESO</Text>
        <GlassCard style={styles.trendCard}>
          {weights.length >= 2 ? (
            <>
              <View style={styles.trendHead}>
                <View>
                  <Text style={[styles.trendValue, { color: palette.text }]}>{fmt(latest!)} kg</Text>
                  <Text style={[styles.trendMeta, { color: palette.textDim }]}>
                    {weights.length} misure
                  </Text>
                </View>
                {delta != null && (
                  <View
                    style={[
                      styles.deltaTag,
                      {
                        backgroundColor:
                          delta < 0 ? palette.successSoft : delta > 0 ? palette.warnSoft : palette.glassFill,
                        borderColor: palette.glassBorderStrong,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deltaText,
                        { color: delta < 0 ? palette.success : delta > 0 ? palette.warn : palette.textDim },
                      ]}
                    >
                      {delta > 0 ? '+' : ''}
                      {fmt(delta)} kg
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ marginTop: space.sm }}>
                <Sparkline
                  values={weights.map(w => w.weightKg)}
                  width={W}
                  height={56}
                  color={palette.accent}
                  fillColor={hexToRgba(stripHash(palette.accent), 0.12)}
                />
              </View>
            </>
          ) : (
            <Text style={[styles.trendEmpty, { color: palette.textDim }]}>
              {weights.length === 1
                ? 'Una sola misura finora — registra il peso ogni tanto per vedere l’andamento.'
                : 'Nessuna misura ancora. Registra il peso per iniziare a tracciarlo.'}
            </Text>
          )}
          <GlassButton
            title="Registra il peso di oggi"
            icon="plus"
            variant="secondary"
            onPress={registerToday}
            block
            style={{ marginTop: space.md }}
          />
        </GlassCard>
      </ScrollView>
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
  intro: { ...typography.subhead, marginBottom: space.md },
  sectionLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: space.xl,
    marginBottom: 8,
    marginLeft: 4,
  },
  trendCard: { padding: space.md },
  trendHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendValue: { ...typography.title2 },
  trendMeta: { ...typography.footnote, marginTop: 2 },
  deltaTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  deltaText: { ...typography.caption1, fontWeight: '800' },
  trendEmpty: { ...typography.footnote, lineHeight: 18 },
});
