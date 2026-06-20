import React, { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { RootStackParamList } from '../navigation/types';
import { formatTimeAgo } from '../lib/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Sync'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function SyncScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const {
    github,
    connectWithPAT,
    disconnectGitHub,
    syncNow,
    pullFromGitHub,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [pat, setPat] = useState('');

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const connectPAT = async () => {
    if (!pat.trim()) return;
    setBusy(true);
    const res = await connectWithPAT(pat.trim());
    setBusy(false);
    if (res.ok) setPat('');
  };

  /* ----------------------------- Connected ----------------------------- */
  if (github.token && github.repo) {
    return (
      <Screen>
        <Header title="Sincronizzazione" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
          <GlassCard style={styles.connectedCard}>
            <View style={[styles.statusDot, { backgroundColor: palette.success }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.connectedLabel, { color: palette.textDim }]}>COLLEGATO</Text>
              <Text style={[styles.connectedName, { color: palette.text }]} numberOfLines={1}>
                @{github.token.login ?? '—'}
              </Text>
              <Text style={[styles.connectedRepo, { color: palette.textFaint }]} numberOfLines={1}>
                {github.repo.owner}/{github.repo.repo}
              </Text>
            </View>
            <Icon name="check" color={palette.success} size={22} />
          </GlassCard>

          {github.lastSyncAt && (
            <Text style={[styles.lastSync, { color: palette.textDim }]}>
              Ultima sincro: {formatTimeAgo(new Date(github.lastSyncAt))}
            </Text>
          )}

          {github.error && (
            <View
              style={[
                styles.error,
                { backgroundColor: palette.dangerSoft, borderColor: palette.glassBorderStrong },
              ]}
            >
              <Icon name="x" color={palette.danger} size={16} />
              <Text style={[styles.errorText, { color: palette.danger }]}>{github.error}</Text>
            </View>
          )}

          <View style={{ gap: 10, marginTop: space.lg }}>
            <GlassButton
              title={github.syncing ? 'Sincronizzazione…' : 'Sincronizza ora'}
              icon="upload"
              onPress={() => syncNow()}
              disabled={github.syncing}
              block
              size="lg"
            />
            <GlassButton
              title="Scarica da GitHub"
              icon="download"
              variant="secondary"
              onPress={() => pullFromGitHub()}
              disabled={github.syncing}
              block
            />
            <GlassButton
              title="Apri repository nel browser"
              icon="share"
              variant="ghost"
              onPress={() => Linking.openURL(github.repo!.htmlUrl).catch(() => {})}
              block
            />
            <GlassButton
              title="Scollega"
              icon="trash"
              variant="danger"
              onPress={async () => {
                await disconnectGitHub();
              }}
              block
            />
          </View>

          <Text style={[styles.legal, { color: palette.textFaint }]}>
            I tuoi dati restano interamente sul tuo account GitHub — l'app non li
            invia da nessun'altra parte. Token salvato nel Keychain di sistema.
          </Text>
        </ScrollView>
      </Screen>
    );
  }

  /* --------------------------- Not connected --------------------------- */
  return (
    <Screen>
      <Header title="Sincronizzazione" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.heroTitleRow}>
          <View
            style={[
              styles.heroTitleIcon,
              { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
            ]}
          >
            <Icon name="layers" color={palette.accent} size={20} />
          </View>
          <Text style={[styles.heroTitle, { color: palette.text }]}>Collega GitHub</Text>
        </View>

        {/* Step 1 — account GitHub */}
        <GlassCard style={[styles.stepCard, { marginTop: space.lg }]}>
          <View style={styles.stepRow}>
            <StepBadge n={1} />
            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, { color: palette.text }]}>
                Accedi o registrati su GitHub
              </Text>
              <Text style={[styles.subtle, { color: palette.textDim }]}>
                Ti serve un account GitHub, è gratis. Se ce l'hai già, accedi e basta.
              </Text>
            </View>
          </View>
          <GlassButton
            title="Apri GitHub"
            icon="share"
            variant="secondary"
            onPress={() => openUrl('https://github.com/login')}
            block
            style={{ marginTop: space.sm }}
          />
        </GlassCard>

        {/* Step 2 — crea la chiave */}
        <GlassCard style={[styles.stepCard, { marginTop: space.md }]}>
          <View style={styles.stepRow}>
            <StepBadge n={2} />
            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, { color: palette.text }]}>
                Crea la chiave di accesso
              </Text>
              <Text style={[styles.subtle, { color: palette.textDim }]}>
                Si apre la pagina giusta con tutto già impostato. Scorri in fondo,
                tocca <Text style={{ fontWeight: '700' }}>Generate token</Text> e
                copia la chiave che appare.
              </Text>
            </View>
          </View>
          <GlassButton
            title="Crea la chiave"
            icon="lightning"
            onPress={() =>
              openUrl('https://github.com/settings/tokens/new?description=VibeGym&scopes=repo')
            }
            block
            style={{ marginTop: space.sm }}
          />
        </GlassCard>

        {/* Step 3 — incolla la chiave */}
        <GlassCard style={[styles.stepCard, { marginTop: space.md }]}>
          <View style={styles.stepRow}>
            <StepBadge n={3} />
            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, { color: palette.text }]}>
                Incolla la chiave qui
              </Text>
              <Text style={[styles.subtle, { color: palette.textDim }]}>
                La salviamo cifrata sul dispositivo: niente server di terzi.
              </Text>
            </View>
          </View>
          <TextInput
            value={pat}
            onChangeText={setPat}
            placeholder="ghp_… o github_pat_…"
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={[
              styles.input,
              {
                color: palette.text,
                backgroundColor: palette.surface,
                borderColor: palette.glassBorderStrong,
              },
            ]}
          />
          <GlassButton
            title={busy || github.syncing ? 'Verifica…' : 'Collega'}
            icon="check"
            onPress={connectPAT}
            disabled={busy || github.syncing || !pat.trim()}
            block
            size="lg"
            style={{ marginTop: space.sm }}
          />
          {github.error && (
            <View
              style={[
                styles.error,
                { backgroundColor: palette.dangerSoft, borderColor: palette.glassBorderStrong, marginTop: 10 },
              ]}
            >
              <Icon name="x" color={palette.danger} size={16} />
              <Text style={[styles.errorText, { color: palette.danger }]}>{github.error}</Text>
            </View>
          )}
        </GlassCard>

        <Text style={[styles.legal, styles.legalFooter, { color: palette.textFaint }]}>
          {Platform.OS === 'ios'
            ? 'Il token è cifrato nel Keychain iOS.'
            : "Il token è cifrato nell'EncryptedSharedPreferences di Android."}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={styles.topbar}>
      <IconButton icon="arrow-left" onPress={onBack} size={42} />
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <View style={{ width: 42 }} />
    </View>
  );
}

function StepBadge({ n }: { n: number }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.stepBadge,
        { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
      ]}
    >
      <Text style={[styles.stepBadgeText, { color: palette.accent }]}>{n}</Text>
    </View>
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
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: space.xs,
  },
  heroTitleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroTitle: { ...typography.title1 },
  connectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  connectedLabel: {
    ...typography.caption2,
    letterSpacing: 0.7,
  },
  connectedName: { ...typography.title2, marginTop: 2 },
  connectedRepo: { ...typography.footnote, marginTop: 2 },
  lastSync: {
    ...typography.footnote,
    marginTop: space.md,
    marginLeft: 4,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginTop: space.sm,
  },
  errorText: { ...typography.footnote, flex: 1 },
  legal: {
    ...typography.caption1,
    marginTop: space.lg,
    textAlign: 'center',
  },
  // Footer pinned to the bottom: `marginTop: 'auto'` pushes it down when the
  // content is shorter than the screen (tall devices), while it still scrolls
  // naturally below the cards when the content overflows.
  legalFooter: {
    marginTop: 'auto',
    paddingTop: space.xxl,
  },
  scrollBody: {
    padding: space.lg,
    paddingBottom: space.xxxl,
    flexGrow: 1,
  },
  stepCard: {
    padding: space.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stepBadgeText: { ...typography.headline },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { ...typography.headline, marginBottom: 2 },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Menlo',
    fontSize: 13,
    marginTop: space.sm,
  },
  subtle: {
    ...typography.caption1,
  },
});
