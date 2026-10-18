import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore, selectActivePlan } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Row, Section } from '../../ui/List';
import { AvatarLarge } from '../../ui/Avatar';
import { Icon } from '../../ui/Icon';
import { ACCENTS } from '../../theme/colors';
import { SettingsProps } from '../../navigation/types';
import { ageFrom } from '../../core/dates';
import { capitalize, greeting } from '../../core/format';
import buildInfo from '../../buildInfo.json';

const THEME_LABEL = { system: 'Automatico', light: 'Chiaro', dark: 'Scuro' };

export function SettingsHome({ navigation }: SettingsProps<'SettingsHome'>) {
  const { c } = useTheme();
  const profile = useStore(s => s.profile);
  const settings = useStore(s => s.settings);
  const plan = useStore(selectActivePlan);
  const plansCount = useStore(s => s.plans.length);
  const root = navigation.getParent();
  const age = ageFrom(profile.birthDate);
  const n = settings.notifications;
  const notifCount = [
    n.restEnd,
    n.workout.enabled,
    n.weighIn.enabled,
    n.measures.enabled,
  ].filter(Boolean).length;

  return (
    <Screen
      title="Profilo"
      eyebrow={capitalize(greeting())}
      close={() => root?.goBack()}
    >
      <Card
        onPress={() => navigation.navigate('ProfileEdit')}
        style={styles.profile}
        accessibilityLabel="Modifica profilo"
      >
        <View style={styles.profileRow}>
          <AvatarLarge name={profile.name} size={64} />
          <View style={styles.flex}>
            <T v="title3" numberOfLines={1}>
              {profile.name || 'Il tuo profilo'}
            </T>
            <T v="subhead" color="secondary" numberOfLines={1}>
              {[
                age != null ? `${age} anni` : null,
                profile.heightCm ? `${profile.heightCm} cm` : null,
                profile.sex === 'male'
                  ? 'Uomo'
                  : profile.sex === 'female'
                  ? 'Donna'
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Aggiungi età, altezza e obiettivi'}
            </T>
          </View>
          <Icon
            name="chevron-right"
            size={16}
            color={c.tertiary}
            weight={2.4}
          />
        </View>
      </Card>

      <Section>
        <Row
          icon="layers"
          iconBg={ACCENTS.indigo.light}
          title="Le mie schede"
          value={plan ? plan.name : plansCount ? `${plansCount}` : 'Nessuna'}
          chevron
          onPress={() => {
            root?.goBack();
            root?.navigate('Plans');
          }}
        />
      </Section>

      <Section>
        <Row
          icon="dumbbell"
          iconBg={ACCENTS.orange.light}
          title="Allenamento"
          value={settings.unit}
          chevron
          onPress={() => navigation.navigate('WorkoutSettings')}
        />
        <Row
          icon="bell"
          iconBg={ACCENTS.red.light}
          title="Notifiche"
          value={notifCount ? `${notifCount} attive` : 'Disattivate'}
          chevron
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <Row
          icon="bluetooth"
          iconBg={ACCENTS.blue.light}
          title="Bilancia"
          value={settings.scale.deviceName ?? 'Non collegata'}
          chevron
          onPress={() => navigation.navigate('ScaleSettings')}
        />
        <Row
          icon="palette"
          iconBg={ACCENTS.purple.light}
          title="Aspetto"
          value={THEME_LABEL[settings.theme]}
          chevron
          onPress={() => navigation.navigate('AppearanceSettings')}
        />
      </Section>

      <Section>
        <Row
          icon="doc"
          iconBg="#8E8E93"
          title="Dati e backup"
          chevron
          onPress={() => navigation.navigate('DataSettings')}
        />
      </Section>

      <T v="footnote" color="tertiary" align="center" style={styles.footer}>
        VibeGym {buildInfo.version}
        {buildInfo.commit ? ` (${buildInfo.commit})` : ''} · I tuoi dati restano
        su questo dispositivo.{'\n'}Animazioni degli esercizi: free-exercise-db
        (pubblico dominio).
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { marginBottom: 28 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  footer: { marginTop: 4 },
});
