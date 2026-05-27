import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
import {
  DeviceCode,
  pollForAccessToken,
  requestDeviceCode,
} from '../lib/github/auth';
import { isOAuthConfigured } from '../lib/github/config';
import { formatTimeAgo } from '../lib/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Sync'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function SyncScreen() {
  const navigation = useNavigation<Nav>();
  const { palette, mode } = useTheme();
  const {
    github,
    connectWithPAT,
    saveDeviceFlowToken,
    disconnectGitHub,
    syncNow,
    pullFromGitHub,
    showToast,
  } = useStore();

  const [mode2, setMode2] = useState<'idle' | 'device' | 'pat'>('idle');
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [deviceErr, setDeviceErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pat, setPat] = useState('');
  const cancelRef = useRef(false);

  useEffect(() => () => {
    cancelRef.current = true;
  }, []);

  const beginDeviceFlow = async () => {
    setMode2('device');
    setDeviceErr(null);
    setBusy(true);
    try {
      const dc = await requestDeviceCode();
      setDeviceCode(dc);
      cancelRef.current = false;
      // Spawn polling
      pollForAccessToken(dc, () => cancelRef.current)
        .then(async token => {
          const res = await saveDeviceFlowToken(token);
          if (!res.ok) setDeviceErr(res.error ?? 'Errore salvataggio token');
          else {
            setMode2('idle');
            setDeviceCode(null);
          }
        })
        .catch(err => {
          setDeviceErr(err instanceof Error ? err.message : String(err));
        });
    } catch (e) {
      setDeviceErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelDeviceFlow = () => {
    cancelRef.current = true;
    setMode2('idle');
    setDeviceCode(null);
    setDeviceErr(null);
  };

  const connectPAT = async () => {
    if (!pat.trim()) return;
    setBusy(true);
    const res = await connectWithPAT(pat.trim());
    setBusy(false);
    if (res.ok) {
      setMode2('idle');
      setPat('');
    }
  };

  const copyCode = () => {
    if (!deviceCode) return;
    Clipboard.setString(deviceCode.user_code);
    showToast('Codice copiato');
  };

  const openVerification = () => {
    if (!deviceCode) return;
    Linking.openURL(deviceCode.verification_uri).catch(() => {});
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
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <GlassCard style={styles.heroCard}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
            ]}
          >
            <Icon name="layers" color={palette.accent} size={28} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Collega GitHub</Text>
            <Text style={[styles.heroSub, { color: palette.textDim }]}>
              Niente server di terzi: la tua scheda e lo storico vivono in una
              repo privata sul tuo account, con tutta la cronologia delle modifiche.
            </Text>
          </View>
        </GlassCard>

        {mode2 === 'idle' && (
          <View style={{ gap: 10, marginTop: space.lg }}>
            <GlassButton
              title="Continua con GitHub"
              icon="lightning"
              onPress={beginDeviceFlow}
              disabled={!isOAuthConfigured()}
              block
              size="lg"
            />
            {!isOAuthConfigured() && (
              <Text style={[styles.subtle, { color: palette.textFaint }]}>
                Device Flow non configurato in questo build (manca il
                client_id). Usa un Personal Access Token qui sotto.
              </Text>
            )}
            <GlassButton
              title="Usa un Personal Access Token"
              icon="copy"
              variant="secondary"
              onPress={() => setMode2('pat')}
              block
            />
          </View>
        )}

        {mode2 === 'device' && (
          <GlassCard style={[styles.deviceCard, { marginTop: space.lg }]}>
            <Text style={[styles.deviceLabel, { color: palette.textDim }]}>
              CODICE PER L'AUTORIZZAZIONE
            </Text>
            {deviceCode ? (
              <Pressable onPress={copyCode}>
                <Text style={[styles.deviceCode, { color: palette.text }]}>
                  {deviceCode.user_code}
                </Text>
                <Text style={[styles.deviceHint, { color: palette.textDim }]}>
                  Tocca per copiare
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.deviceCode, { color: palette.textFaint }]}>—</Text>
            )}
            <View style={{ gap: 10, marginTop: space.md }}>
              <GlassButton
                title="Apri pagina di autorizzazione"
                icon="share"
                onPress={openVerification}
                disabled={!deviceCode}
                block
                size="lg"
              />
              <GlassButton title="Annulla" variant="ghost" onPress={cancelDeviceFlow} block />
            </View>
            {deviceErr && (
              <View
                style={[
                  styles.error,
                  { backgroundColor: palette.dangerSoft, borderColor: palette.glassBorderStrong, marginTop: 10 },
                ]}
              >
                <Icon name="x" color={palette.danger} size={16} />
                <Text style={[styles.errorText, { color: palette.danger }]}>{deviceErr}</Text>
              </View>
            )}
            <Text style={[styles.subtle, { color: palette.textFaint, marginTop: space.md }]}>
              Apri la pagina, incolla il codice e autorizza l'app. La connessione
              avviene automaticamente quando hai approvato.
            </Text>
          </GlassCard>
        )}

        {mode2 === 'pat' && (
          <GlassCard style={[styles.deviceCard, { marginTop: space.lg }]}>
            <Text style={[styles.deviceLabel, { color: palette.textDim }]}>
              PERSONAL ACCESS TOKEN
            </Text>
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
            <Text style={[styles.subtle, { color: palette.textFaint, marginTop: 6 }]}>
              Crea un fine-grained token con accesso a "repo" su{' '}
              <Text style={{ color: palette.accent }} onPress={() => Linking.openURL('https://github.com/settings/tokens?type=beta')}>
                github.com/settings/tokens
              </Text>
              . Lo conserveremo nel Keychain del dispositivo.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: space.md }}>
              <GlassButton
                title="Annulla"
                variant="ghost"
                onPress={() => setMode2('idle')}
                block
                style={{ flex: 1 }}
              />
              <GlassButton
                title={busy || github.syncing ? 'Verifica…' : 'Collega'}
                onPress={connectPAT}
                disabled={busy || github.syncing || !pat.trim()}
                block
                style={{ flex: 1 }}
              />
            </View>
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
        )}

        <Text style={[styles.legal, { color: palette.textFaint, marginTop: space.xxl }]}>
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: space.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroTitle: { ...typography.title2 },
  heroSub: { ...typography.subhead, marginTop: 4 },
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
  deviceCard: {
    padding: space.md,
  },
  deviceLabel: {
    ...typography.caption1,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  deviceCode: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginVertical: 4,
  },
  deviceHint: {
    ...typography.caption1,
    textAlign: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Menlo',
    fontSize: 13,
    marginTop: 6,
  },
  subtle: {
    ...typography.caption1,
  },
});
