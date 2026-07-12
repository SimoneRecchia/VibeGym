import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Share,
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
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { Icon, IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { formatDateTime } from '../lib/format';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Menu'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function MenuScreen() {
  const navigation = useNavigation<Nav>();
  const { palette, mode } = useTheme();
  const { plan, exportPlanJSON, resetProgress, disconnectPlan, showToast, github } = useStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const hasPlan = !!plan;
  const sessions = plan?.storico?.length ?? 0;

  const onExport = async () => {
    const json = exportPlanJSON();
    if (!json) {
      showToast('Nessuna scheda da esportare');
      return;
    }
    try {
      await Share.share({
        message: json,
        title: `vibe-gym-scheda-${new Date().toISOString().slice(0, 10)}.json`,
      });
      showToast('JSON pronto');
    } catch {
      showToast('Condivisione annullata');
    }
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Opzioni</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <SectionHead title="Allenamento" />
        <MenuItem
          icon="gear"
          label="Impostazioni"
          hint="Suoni, vibrazione, timer"
          onPress={() => navigation.navigate('Settings')}
        />
        <MenuItem
          icon="chart"
          label="Storico"
          hint={sessions === 0 ? 'Nessuna sessione' : `${sessions} sessioni`}
          onPress={() => navigation.navigate('History')}
          disabled={!hasPlan}
        />
        <MenuItem
          icon="sparkles"
          label="Grafici progressione"
          hint="Pesi nel tempo per esercizio"
          onPress={() => navigation.navigate('Charts')}
          disabled={sessions === 0}
        />

        <SectionHead title="Salvataggio" />
        <MenuItem
          icon="cloud"
          label={github.token ? 'Salvataggio sul cloud' : 'Attiva salvataggio sul cloud'}
          hint={
            github.token
              ? github.lastSyncAt
                ? `Sincronizzato: ${formatDateTime(github.lastSyncAt)}`
                : `Attivo${github.token.login ? ` · @${github.token.login}` : ''}`
              : 'Ora: solo su questo telefono'
          }
          onPress={() => navigation.navigate('Sync')}
        />

        <SectionHead title="Scheda" />
        <MenuItem
          icon="layers"
          label="Le tue schede"
          hint="Gestisci e cambia scheda attiva"
          onPress={() => navigation.navigate('Schede')}
          disabled={!hasPlan}
        />
        <MenuItem
          icon="sparkles"
          label="Crea o converti una scheda"
          hint="Procedura guidata con l'AI"
          onPress={() => navigation.navigate('PlanWizard')}
        />
        <MenuItem icon="download" label="Importa scheda" hint="Da file JSON" onPress={() => navigation.navigate('Import')} />
        <MenuItem
          icon="upload"
          label="Esporta scheda corrente"
          hint="Condividi o salva"
          onPress={onExport}
          disabled={!hasPlan}
        />
        <MenuItem
          icon="layers"
          label="Dettagli scheda"
          hint={plan?.nome_scheda ?? '—'}
          onPress={() => navigation.navigate('Schema')}
          disabled={!hasPlan}
        />

        <SectionHead title="Azzeramenti" tone="danger" />
        <MenuItem
          icon="refresh"
          label="Azzera progressi"
          hint="Mantieni lo storico, resetta i giorni"
          onPress={() => setShowResetConfirm(true)}
          disabled={!hasPlan}
        />
        <MenuItem
          icon="trash"
          label="Scollega scheda"
          hint="Rimuove tutto"
          tone="danger"
          onPress={() => setShowDisconnectConfirm(true)}
          disabled={!hasPlan}
        />
      </ScrollView>

      <ConfirmModal
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Azzera progressi?"
        body="Rimuove tutte le spunte, i pesi personalizzati e le note da ogni giorno. Lo storico non viene toccato."
        confirmLabel="Azzera"
        onConfirm={() => {
          setShowResetConfirm(false);
          resetProgress();
        }}
      />

      <ConfirmModal
        visible={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        title="Rimuovere la scheda?"
        body={
          github.token
            ? 'La scheda resta salvata sul cloud: potrai riscaricarla. Rimuove solo la copia su questo telefono.'
            : 'Perderai la scheda e lo storico da questo telefono. Consigliato: esporta il JSON per sicurezza.'
        }
        confirmLabel="Rimuovi"
        danger
        secondaryLabel="Esporta prima"
        onSecondary={async () => {
          await onExport();
        }}
        onConfirm={() => {
          setShowDisconnectConfirm(false);
          disconnectPlan();
        }}
      />
    </Screen>
  );
}

function SectionHead({ title, tone }: { title: string; tone?: 'danger' }) {
  const { palette } = useTheme();
  return (
    <Text
      style={[
        styles.sectionHead,
        { color: tone === 'danger' ? palette.danger : palette.textFaint },
      ]}
    >
      {title.toUpperCase()}
    </Text>
  );
}

function MenuItem({
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
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  const { palette, mode } = useTheme();
  const fg = tone === 'danger' ? palette.danger : palette.text;
  const iconBg = tone === 'danger' ? palette.dangerSoft : palette.accentSoft;
  const iconBorder = tone === 'danger' ? hexToRgba('#FB7185', 0.4) : hexToRgba(stripHash(palette.accent), 0.45);
  const iconColor = tone === 'danger' ? palette.danger : palette.accent;

  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      style={{ marginBottom: 10, opacity: disabled ? 0.4 : 1 }}
    >
      <GlassCard rounded="lg" style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: iconBg,
              borderColor: iconBorder,
            },
          ]}
        >
          <Icon name={icon} color={iconColor} size={18} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
          {hint && (
            <Text style={[styles.hint, { color: palette.textDim }]} numberOfLines={1}>
              {hint}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" color={palette.textFaint} size={18} />
      </GlassCard>
    </PressableScale>
  );
}

function ConfirmModal({
  visible,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  danger,
  secondaryLabel,
  onSecondary,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
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
          {secondaryLabel && onSecondary && (
            <GlassButton
              title={secondaryLabel}
              icon="upload"
              onPress={onSecondary}
              block
              size="lg"
              style={{ marginBottom: 10 }}
            />
          )}
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
  title: {
    ...typography.title2,
  },
  sectionHead: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: space.md,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 14,
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
  label: {
    ...typography.headline,
  },
  hint: {
    ...typography.footnote,
    marginTop: 2,
  },
  modalBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.lg,
  },
  confirmTitle: {
    ...typography.title2,
    marginBottom: 6,
  },
  confirmBody: {
    ...typography.body,
    marginBottom: space.md,
  },
});
