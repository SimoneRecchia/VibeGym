import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore, selectLatestWeight } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { Row, Section } from '../../ui/List';
import { T } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { normalizeBirthDate } from '../../data/storage';
import { ageFrom } from '../../core/dates';
import { fromDisplay, toDisplay } from '../../core/units';
import { Experience, Sex } from '../../core/types';

const toDMY = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export function ProfileEdit() {
  const profile = useStore(s => s.profile);
  const setProfile = useStore(s => s.setProfile);
  const unit = useStore(s => s.settings.unit);
  const latest = useStore(selectLatestWeight);
  const [birth, setBirth] = useState(toDMY(profile.birthDate));
  const age = ageFrom(profile.birthDate);

  return (
    <Screen title="Profilo" back keyboard>
      <TextField
        label="Nome"
        value={profile.name ?? ''}
        onChangeText={t => setProfile({ name: t || undefined })}
        placeholder="Come ti chiami?"
        autoCapitalize="words"
      />
      <TextField
        label="Data di nascita"
        value={birth}
        onChangeText={t => {
          setBirth(t);
          const iso = normalizeBirthDate(t);
          if (iso) setProfile({ birthDate: iso });
        }}
        placeholder="gg/mm/aaaa"
        keyboardType="numbers-and-punctuation"
        hint={
          age != null
            ? `${age} anni`
            : 'Serve per la composizione corporea e i prompt AI'
        }
      />

      <View style={styles.block}>
        <Segmented
          options={[
            { key: 'male', label: 'Uomo' },
            { key: 'female', label: 'Donna' },
          ]}
          value={(profile.sex ?? 'male') as Sex}
          onChange={v => setProfile({ sex: v })}
        />
      </View>

      <Card style={styles.block}>
        <Stepper
          label="Altezza"
          value={profile.heightCm ?? 175}
          onChange={v => setProfile({ heightCm: v })}
          step={1}
          min={100}
          max={230}
          decimals={0}
          unit="cm"
          size="m"
        />
      </Card>

      <Section footer="Compare come linea nel grafico del peso, con quanto manca.">
        <Row
          title="Peso obiettivo"
          toggle={{
            value: profile.goalWeightKg != null,
            onChange: v =>
              setProfile({
                goalWeightKg: v
                  ? Math.round((latest?.weightKg ?? 75) - 3)
                  : undefined,
              }),
          }}
        />
        {profile.goalWeightKg != null ? (
          <View style={styles.pad}>
            <Stepper
              value={
                Math.round(toDisplay(profile.goalWeightKg, unit) * 10) / 10
              }
              onChange={v =>
                setProfile({
                  goalWeightKg: Math.round(fromDisplay(v, unit) * 10) / 10,
                })
              }
              step={0.5}
              min={30}
              max={400}
              decimals={1}
              unit={unit}
              size="m"
            />
          </View>
        ) : null}
      </Section>

      <T v="footnote" color="secondary" style={styles.label}>
        ESPERIENZA
      </T>
      <View style={styles.block}>
        <Segmented
          options={[
            { key: 'beginner', label: 'Principiante' },
            { key: 'intermediate', label: 'Intermedio' },
            { key: 'advanced', label: 'Avanzato' },
          ]}
          value={(profile.experience ?? 'beginner') as Experience}
          onChange={v => setProfile({ experience: v })}
        />
      </View>
      <TextField
        label="Infortuni o limitazioni"
        value={profile.injuries ?? ''}
        onChangeText={t => setProfile({ injuries: t || undefined })}
        multiline
        placeholder="Usati dall'AI quando crea o modifica la scheda"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 16 },
  pad: { padding: 14 },
  label: { marginLeft: 16, marginBottom: 6 },
});
