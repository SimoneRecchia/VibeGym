import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
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
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Icon, IconName } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { PressableScale } from '../components/PressableScale';
import { WeightUnit } from '../lib/types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

type BooleanSettingKey =
  | 'haptic'
  | 'sound'
  | 'countdownWarn'
  | 'autoExpandTimer'
  | 'skipLastRest'
  | 'keepScreenOn';

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const {
    settings,
    setSetting,
    plan,
    profile,
    exportPlanJSON,
    resetProgress,
    disconnectPlan,
    showToast,
    github,
    disconnectGitHub,
  } = useStore();
  const { palette, mode, toggle } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDisconnectGitHubConfirm, setShowDisconnectGitHubConfirm] = useState(false);

  const trainingItems: { key: BooleanSettingKey; label: string; hint: string; icon: IconName }[] = [
    { key: 'haptic', label: 'Vibrazione', hint: 'Feedback tattile sui tasti', icon: 'sparkles' },
    { key: 'sound', label: 'Suoni', hint: 'Beep al termine del timer', icon: 'lightning' },
    { key: 'countdownWarn', label: 'Avviso countdown', hint: 'Tick negli ultimi 3 secondi', icon: 'timer' },
    { key: 'autoExpandTimer', label: 'Timer a tutto schermo', hint: 'Apri timer in grande quando parte', icon: 'sparkles' },
    { key: 'skipLastRest', label: 'Salta ultimo recupero', hint: "Non avviare il timer dopo l'ultima serie", icon: 'check' },
    { key: 'keepScreenOn', label: 'Tieni schermo acceso', hint: 'Durante un allenamento', icon: 'sun' },
  ];

  const units: { value: WeightUnit; label: string }[] = [
    { value: 'kg', label: 'kg' },
    { value: 'lb', label: 'lb' },
    { value: 'bw', label: 'BW' },
  ];

  const timerPositions: { value: 'top' | 'bottom'; label: string }[] = [
    { value: 'top', label: 'In alto' },
    { value: 'bottom', label: 'In basso' },
  ];

  const onExportJson = async () => {
    const json = exportPlanJSON();
    if (!json) {
      showToast('Nessuna scheda da esportare');
      return;
    }
    try {
      await Share.share({
        message: json,
        title: `vibe-gym-${plan?.id ?? 'scheda'}-${new Date().toISOString().slice(0, 10)}.json`,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Impostazioni</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        {/* PROFILO */}
        <Section title="Profilo">
          <GlassCard style={[styles.card, { marginBottom: space.sm }]}>
            <NavRow
              icon="pencil"
              label="Dati personali"
              hint={profile.name ? profile.name : 'Nome, data di nascita, peso, altezza'}
              onPress={() => navigation.navigate('Profile')}
            />
          </GlassCard>
          {github.token ? (
            <PressableScale onPress={() => navigation.navigate('Sync')}>
              <GlassCard style={styles.profile}>
                <Avatar url={github.token.avatarUrl} fallback={github.token.login} size={56} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
                    {github.token.name || github.token.login}
                  </Text>
                  <Text style={[styles.profileSub, { color: palette.textDim }]} numberOfLines={1}>
                    @{github.token.login}
                  </Text>
                  {github.repo && (
                    <Text style={[styles.profileRepo, { color: palette.textFaint }]} numberOfLines={1}>
                      {github.repo.owner}/{github.repo.repo}
                    </Text>
                  )}
                </View>
                <Icon name="chevron-right" color={palette.textFaint} size={18} />
              </GlassCard>
            </PressableScale>
          ) : (
            <PressableScale onPress={() => navigation.navigate('Sync')}>
              <GlassCard style={styles.connectRow}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: palette.accentSoft,
                      borderColor: hexToRgba(stripHash(palette.accent), 0.5),
                    },
                  ]}
                >
                  <Icon name="layers" color={palette.accent} size={20} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Collega GitHub</Text>
                  <Text style={[styles.itemHint, { color: palette.textDim }]} numberOfLines={1}>
                    Backup scheda + storico nella tua repo
                  </Text>
                </View>
                <Icon name="chevron-right" color={palette.textFaint} size={18} />
              </GlassCard>
            </PressableScale>
          )}
        </Section>

        {/* ASPETTO */}
        <Section title="Aspetto">
          <GlassCard style={styles.card}>
            <RowItem
              icon={mode === 'dark' ? 'moon' : 'sun'}
              label="Tema"
              hint={mode === 'dark' ? 'Scuro' : 'Chiaro'}
              right={
                <Switch
                  value={mode === 'dark'}
                  onValueChange={toggle}
                  trackColor={{ true: palette.accent, false: palette.dividerStrong }}
                  thumbColor="#fff"
                />
              }
            />
            <Divider />
            <RowItem
              icon="dumbbell"
              label="Unità peso"
              hint="Predefinita per nuovi inserimenti"
              right={
                <View style={styles.segmented}>
                  {units.map(u => {
                    const active = settings.defaultUnit === u.value;
                    return (
                      <Pressable
                        key={u.value}
                        onPress={() => setSetting('defaultUnit', u.value)}
                        style={[
                          styles.segItem,
                          {
                            backgroundColor: active ? palette.accent : 'transparent',
                          },
                        ]}
                      >
                        <Text style={[styles.segText, { color: active ? '#fff' : palette.text }]}>
                          {u.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              }
            />
          </GlassCard>
        </Section>

        {/* ALLENAMENTO */}
        <Section title="Allenamento">
          <GlassCard style={styles.card}>
            {trainingItems.map((it, i) => (
              <View key={it.key}>
                <RowItem
                  icon={it.icon}
                  label={it.label}
                  hint={it.hint}
                  right={
                    <Switch
                      value={settings[it.key]}
                      onValueChange={(v: boolean) => setSetting(it.key, v)}
                      trackColor={{ true: palette.accent, false: palette.dividerStrong }}
                      thumbColor="#fff"
                    />
                  }
                />
                {i < trainingItems.length - 1 && <Divider />}
              </View>
            ))}
            <Divider />
            <RowItem
              icon="timer"
              label="Posizione timer"
              hint="Dove compare il timer di recupero"
              right={
                <View style={styles.segmented}>
                  {timerPositions.map(p => {
                    const active = settings.timerPosition === p.value;
                    return (
                      <Pressable
                        key={p.value}
                        onPress={() => setSetting('timerPosition', p.value)}
                        style={[
                          styles.segItem,
                          { backgroundColor: active ? palette.accent : 'transparent' },
                        ]}
                      >
                        <Text style={[styles.segText, { color: active ? '#fff' : palette.text }]}>
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              }
            />
          </GlassCard>
        </Section>

        {/* AVANZATO */}
        <Section title="Avanzato">
          <GlassCard style={styles.card}>
            <NavRow
              icon="upload"
              label="Esporta scheda (JSON)"
              hint="Condividi o salva una copia"
              onPress={onExportJson}
              disabled={!plan}
            />
            <Divider />
            <NavRow
              icon="bulb"
              label="Come creare un JSON"
              hint="Prompt AI + esempio"
              onPress={() => navigation.navigate('Format')}
            />
            <Divider />
            <NavRow
              icon="refresh"
              label="Cambia scheda"
              hint="Importa una scheda diversa"
              onPress={() => navigation.navigate('Import')}
            />
            <Divider />
            <NavRow
              icon="layers"
              label="Dettagli scheda"
              hint={plan?.nome_scheda ?? '—'}
              onPress={() => navigation.navigate('Schema')}
              disabled={!plan}
            />
          </GlassCard>
        </Section>

        {/* AZZERAMENTO */}
        <Section title="Azzeramenti" tone="danger">
          <GlassCard style={styles.card}>
            <NavRow
              icon="refresh"
              label="Azzera progressi"
              hint="Mantiene lo storico, resetta i giorni"
              onPress={() => setShowResetConfirm(true)}
              disabled={!plan}
            />
            <Divider />
            <NavRow
              icon="trash"
              label="Rimuovi scheda locale"
              hint="Resta tutto su GitHub"
              tone="danger"
              onPress={() => disconnectPlan()}
              disabled={!plan}
            />
            {github.token && (
              <>
                <Divider />
                <NavRow
                  icon="x"
                  label="Scollega GitHub"
                  hint="Token cancellato dal device"
                  tone="danger"
                  onPress={() => setShowDisconnectGitHubConfirm(true)}
                />
              </>
            )}
          </GlassCard>
        </Section>

        {/* INFO */}
        <Section title="Info">
          <GlassCard style={styles.card}>
            {github.repo ? (
              <NavRow
                icon="share"
                label="Apri repo su GitHub"
                hint={`${github.repo.owner}/${github.repo.repo}`}
                onPress={() => Linking.openURL(github.repo!.htmlUrl).catch(() => {})}
              />
            ) : (
              <NavRow icon="share" label="Vibe Gym" hint="Versione 1.0" onPress={() => {}} disabled />
            )}
          </GlassCard>
        </Section>

        <Text style={[styles.footer, { color: palette.textFaint }]}>Vibe Gym</Text>
      </ScrollView>

      <ConfirmModal
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Azzera progressi?"
        body="Rimuove spunte, pesi personalizzati e note da ogni giorno. Lo storico non viene toccato."
        confirmLabel="Azzera"
        onConfirm={() => {
          setShowResetConfirm(false);
          resetProgress();
        }}
      />

      <ConfirmModal
        visible={showDisconnectGitHubConfirm}
        onClose={() => setShowDisconnectGitHubConfirm(false)}
        title="Scollegare GitHub?"
        body="Il token viene cancellato dal device. La tua repo e i dati su GitHub non vengono toccati: ti basterà ricollegare per ritrovarli."
        confirmLabel="Scollega"
        danger
        onConfirm={async () => {
          setShowDisconnectGitHubConfirm(false);
          await disconnectGitHub();
        }}
      />
    </Screen>
  );
}

/* ============================================================
 *  Helpers
 * ============================================================ */

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text
        style={[
          styles.section,
          { color: tone === 'danger' ? palette.danger : palette.textFaint },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function RowItem({
  icon,
  label,
  hint,
  right,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.rowItem}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
        ]}
      >
        <Icon name={icon} color={palette.accent} size={18} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.itemLabel, { color: palette.text }]}>{label}</Text>
        {hint && (
          <Text style={[styles.itemHint, { color: palette.textDim }]} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

function NavRow({
  icon,
  label,
  hint,
  onPress,
  disabled,
  tone,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  const { palette } = useTheme();
  const fg = tone === 'danger' ? palette.danger : palette.text;
  const iconColor = tone === 'danger' ? palette.danger : palette.accent;
  const iconBg = tone === 'danger' ? palette.dangerSoft : palette.accentSoft;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.rowItem,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: iconBg,
            borderColor: hexToRgba(stripHash(iconColor), 0.5),
          },
        ]}
      >
        <Icon name={icon} color={iconColor} size={18} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.itemLabel, { color: fg }]}>{label}</Text>
        {hint && (
          <Text style={[styles.itemHint, { color: palette.textDim }]} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      <Icon name="chevron-right" color={palette.textFaint} size={18} />
    </Pressable>
  );
}

function Divider() {
  const { palette } = useTheme();
  return <View style={[styles.divider, { backgroundColor: palette.divider }]} />;
}

function ConfirmModal({
  visible,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  danger,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const { palette, mode } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.modalBg, { backgroundColor: palette.scrim }]}>
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: mode === 'dark' ? 'rgba(22,22,28,0.97)' : 'rgba(255,255,255,0.99)',
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.confirmBody, { color: palette.textDim }]}>{body}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <GlassButton title="Annulla" variant="secondary" onPress={onClose} block style={{ flex: 1 }} />
            <GlassButton
              title={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              onPress={onConfirm}
              block
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
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
  section: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    gap: 14,
  },
  profileName: { ...typography.title3 },
  profileSub: { ...typography.footnote, marginTop: 2 },
  profileRepo: { ...typography.caption1, marginTop: 4 },
  connectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    gap: 12,
  },
  card: { padding: 4 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  itemLabel: { ...typography.headline },
  itemHint: { ...typography.footnote, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(127,127,127,0.25)',
  },
  segItem: { paddingHorizontal: 12, paddingVertical: 7 },
  segText: { ...typography.footnote, fontWeight: '700' },
  footer: { ...typography.caption1, textAlign: 'center', marginTop: space.xxl },
  modalBg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.lg,
  },
  confirmTitle: { ...typography.title2, marginBottom: 6 },
  confirmBody: { ...typography.body, marginBottom: space.md },
});
