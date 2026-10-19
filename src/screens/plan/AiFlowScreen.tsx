/**
 * AI assistant flow. The app never talks to an AI itself: it builds a
 * precise prompt (schema + exercise catalog + your data), you paste it in
 * the chat you prefer, then paste the answer back here.
 *
 *  - create:  questionnaire → prompt for a brand-new plan
 *  - convert: your existing plan (photo/PDF/text) → our format, optionally improved
 *  - modify:  current plan + real progress → modified plan
 */
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Share, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { TextField } from '../../ui/TextField';
import { Row, Section } from '../../ui/List';
import { useTheme } from '../../theme/ThemeProvider';
import {
  selectActivePlan,
  selectLatestWeight,
  useStore,
} from '../../data/store';
import { useDraft } from '../../data/draft';
import {
  AI_APPS,
  EQUIPMENT_OPTIONS,
  FULL_GYM,
  buildConvertPrompt,
  buildCreatePrompt,
  buildModifyPrompt,
} from '../../plan/prompts';
import { parsePlanText } from '../../plan/aiFormat';
import { pickTextFile } from '../../services/files';
import { normalizeBirthDate } from '../../data/storage';
import { Experience, Profile, Sex } from '../../core/types';
import { ScreenProps } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { fmtNum } from '../../core/format';

const GOALS = [
  'Massa muscolare',
  'Forza',
  'Definizione',
  'Dimagrimento',
  'Tonificazione',
  'Resistenza',
  'Salute e benessere',
  'Mobilità',
];
const MINUTES = [30, 45, 60, 75, 90];
const MODIFY_IDEAS = [
  'Aggiorna i carichi in base ai miei progressi',
  'Aggiungi un giorno',
  'Sessioni più corte',
  'Più lavoro per le braccia',
  'Sostituisci gli esercizi che richiedono il bilanciere',
];
const EQUIPMENT_PRESETS: { label: string; keys: string[] }[] = [
  { label: 'Palestra completa', keys: FULL_GYM },
  { label: 'Manubri a casa', keys: ['dumbbell', 'bands'] },
  { label: 'Solo corpo libero', keys: [] },
];

const toDMY = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const TITLES = {
  create: 'Crea con l’AI',
  convert: 'Converti la tua scheda',
  modify: 'Modifica con l’AI',
};

export function AiFlowScreen({ route, navigation }: ScreenProps<'AiFlow'>) {
  const { mode } = route.params;
  const { c } = useTheme();
  const profile = useStore(s => s.profile);
  const setProfile = useStore(s => s.setProfile);
  const latest = useStore(selectLatestWeight);
  const plan = useStore(selectActivePlan);
  const sessions = useStore(s => s.sessions);
  const bodyCount = useStore(s => s.body.length);
  const addBodyEntry = useStore(s => s.addBodyEntry);

  const [step, setStep] = useState<'form' | 'prompt'>('form');
  const [sex, setSex] = useState<Sex>(profile.sex ?? 'male');
  const [birth, setBirth] = useState(toDMY(profile.birthDate));
  const [height, setHeight] = useState(profile.heightCm ?? 175);
  const [weight, setWeight] = useState(latest?.weightKg ?? 75);
  const [goals, setGoals] = useState<string[]>(
    profile.goals?.length ? profile.goals : ['Massa muscolare'],
  );
  const [experience, setExperience] = useState<Experience>(
    profile.experience ?? 'beginner',
  );
  const [days, setDays] = useState(profile.daysPerWeek ?? 3);
  const [minutes, setMinutes] = useState(profile.sessionMin ?? 60);
  const [equipment, setEquipment] = useState<string[]>(
    profile.equipment ?? FULL_GYM,
  );
  const [injuries, setInjuries] = useState(profile.injuries ?? '');
  const [exclusions, setExclusions] = useState(profile.exclusions ?? '');
  const [notes, setNotes] = useState('');
  const [improve, setImprove] = useState(false);
  const [includeProfile, setIncludeProfile] = useState(true);
  const [request, setRequest] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const generate = () => {
    let text = '';
    if (mode === 'create') {
      const patch: Partial<Profile> = {
        sex,
        birthDate: normalizeBirthDate(birth) ?? profile.birthDate,
        heightCm: height,
        experience,
        daysPerWeek: days,
        sessionMin: minutes,
        equipment,
        goals,
        injuries: injuries.trim() || undefined,
        exclusions: exclusions.trim() || undefined,
      };
      setProfile(patch);
      if (!bodyCount)
        addBodyEntry({
          date: new Date().toISOString(),
          weightKg: weight,
          source: 'manual',
        });
      text = buildCreatePrompt(
        { ...profile, ...patch },
        { notes: notes.trim() || undefined, currentWeightKg: weight },
      );
    } else if (mode === 'convert') {
      text = buildConvertPrompt({
        improve,
        notes: notes.trim() || undefined,
        profile: includeProfile ? profile : undefined,
        currentWeightKg: latest?.weightKg,
      });
    } else if (plan) {
      text = buildModifyPrompt(
        plan,
        sessions,
        request,
        profile,
        latest?.weightKg,
      );
    }
    setPrompt(text);
    setCopied(false);
    setStep('prompt');
    haptic('success');
  };

  const copy = () => {
    Clipboard.setString(prompt);
    setCopied(true);
    haptic('success');
  };

  const importText = (text: string) => {
    try {
      const parsed = parsePlanText(text);
      useDraft.setState({
        parsed,
        replacesPlanId: mode === 'modify' && plan ? plan.id : null,
      });
      navigation.navigate('ImportReview');
    } catch (e) {
      Alert.alert(
        'Non riesco a leggere la risposta',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getString();
    if (!text.trim()) {
      Alert.alert(
        'Appunti vuoti',
        'Copia la risposta dell’AI (il blocco JSON) e riprova.',
      );
      return;
    }
    if (text === prompt) {
      Alert.alert(
        'Negli appunti c’è ancora il prompt',
        'Copia la risposta dell’AI, non il prompt.',
      );
      return;
    }
    importText(text);
  };

  const fromFile = async () => {
    try {
      const text = await pickTextFile();
      if (text) importText(text);
    } catch (e) {
      Alert.alert(
        'File non valido',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const sizeKb = useMemo(() => Math.round(prompt.length / 1024), [prompt]);

  if (mode === 'modify' && !plan) {
    return (
      <Screen title={TITLES[mode]} back>
        <T v="body" color="secondary">
          Prima crea o importa una scheda.
        </T>
      </Screen>
    );
  }

  if (step === 'prompt') {
    return (
      <Screen
        title="Il tuo prompt"
        eyebrow={TITLES[mode]}
        back={() => setStep('form')}
        keyboard
      >
        <Card style={styles.card}>
          <StepTitle n={1} title="Copia il prompt" />
          <T
            v="footnote"
            color="secondary"
            style={styles.preview}
            numberOfLines={5}
          >
            {prompt}
          </T>
          <T v="caption" color="tertiary">
            {sizeKb} KB · include formato, regole e la lista degli esercizi con
            animazione
          </T>
          <View style={styles.actions}>
            <Button
              title={copied ? 'Copiato' : 'Copia prompt'}
              icon={copied ? 'check' : 'copy'}
              onPress={copy}
              style={styles.flex}
            />
            <Button
              icon="share"
              variant="glass"
              onPress={() => Share.share({ message: prompt }).catch(() => {})}
              accessibilityLabel="Condividi prompt"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <StepTitle n={2} title="Incollalo in una chat AI" />
          <T v="subhead" color="secondary">
            {mode === 'convert'
              ? 'Apri una nuova chat, incolla il prompt e allega la foto, il PDF o il testo della tua scheda.'
              : 'Apri una nuova chat e incolla il prompt. Se l’AI ti fa domande, rispondi: poi ti darà il JSON.'}
          </T>
          <View style={styles.chips}>
            {AI_APPS.map(a => (
              <Chip
                key={a.key}
                label={a.label}
                icon="external"
                onPress={() => Linking.openURL(a.url).catch(() => {})}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <StepTitle n={3} title="Importa la risposta" />
          <T v="subhead" color="secondary">
            Copia il blocco JSON della risposta (o scarica il file scheda.json)
            e torna qui.
          </T>
          <View style={styles.stack}>
            <Button
              title="Incolla dagli appunti"
              icon="clipboard"
              onPress={pasteFromClipboard}
            />
            <Button
              title="Scegli un file .json"
              icon="import"
              variant="glass"
              onPress={fromFile}
            />
            {manual == null ? (
              <Button
                title="Incolla a mano"
                variant="plain"
                onPress={() => setManual('')}
              />
            ) : (
              <>
                <TextField
                  value={manual}
                  onChangeText={setManual}
                  multiline
                  placeholder="Incolla qui la risposta dell'AI"
                  style={[styles.manual, { backgroundColor: c.fill4 }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <Button
                  title="Importa"
                  icon="check"
                  variant="tinted"
                  onPress={() => importText(manual)}
                  disabled={!manual.trim()}
                />
              </>
            )}
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title={TITLES[mode]}
      back
      keyboard
      footer={
        <Button
          title="Genera il prompt"
          icon="sparkles"
          onPress={generate}
          disabled={mode === 'create' && !goals.length}
        />
      }
    >
      {mode === 'create' ? (
        <>
          <Section
            title="Su di te"
            footer="Servono all'AI per dosare volumi e carichi. Restano solo sul tuo telefono."
          >
            <View style={styles.pad}>
              <Segmented
                options={[
                  { key: 'male', label: 'Uomo' },
                  { key: 'female', label: 'Donna' },
                ]}
                value={sex}
                onChange={setSex}
              />
            </View>
            <View style={styles.pad}>
              <TextField
                label="Data di nascita"
                value={birth}
                onChangeText={setBirth}
                placeholder="gg/mm/aaaa"
                keyboardType="numbers-and-punctuation"
                style={{ backgroundColor: c.fill4 }}
              />
            </View>
            <View style={styles.pad}>
              <Stepper
                label="Altezza"
                value={height}
                onChange={setHeight}
                step={1}
                min={120}
                max={230}
                decimals={0}
                unit="cm"
                size="m"
              />
            </View>
            <View style={styles.pad}>
              <Stepper
                label="Peso"
                value={weight}
                onChange={setWeight}
                step={0.5}
                min={30}
                max={250}
                decimals={1}
                unit="kg"
                size="m"
              />
            </View>
          </Section>

          <Section title="Obiettivi">
            <View style={[styles.pad, styles.chips]}>
              {GOALS.map(g => (
                <Chip
                  key={g}
                  label={g}
                  selected={goals.includes(g)}
                  onPress={() => setGoals(l => toggle(l, g))}
                />
              ))}
            </View>
          </Section>

          <Section title="Esperienza e tempo">
            <View style={styles.pad}>
              <Segmented
                options={[
                  { key: 'beginner', label: 'Principiante' },
                  { key: 'intermediate', label: 'Intermedio' },
                  { key: 'advanced', label: 'Avanzato' },
                ]}
                value={experience}
                onChange={setExperience}
              />
            </View>
            <View style={styles.pad}>
              <Stepper
                label="Allenamenti a settimana"
                value={days}
                onChange={setDays}
                step={1}
                min={1}
                max={7}
                decimals={0}
                size="m"
                format={v => `${fmtNum(v, 0)} ${v === 1 ? 'giorno' : 'giorni'}`}
              />
            </View>
            <View style={styles.pad}>
              <T
                v="footnoteStrong"
                color="secondary"
                align="center"
                style={styles.label}
              >
                Durata massima
              </T>
              <View style={[styles.chips, styles.center]}>
                {MINUTES.map(m => (
                  <Chip
                    key={m}
                    label={`${m} min`}
                    selected={minutes === m}
                    onPress={() => setMinutes(m)}
                  />
                ))}
              </View>
            </View>
          </Section>

          <Section title="Attrezzatura">
            <View style={[styles.pad, styles.chips]}>
              {EQUIPMENT_PRESETS.map(p => (
                <Chip
                  key={p.label}
                  label={p.label}
                  icon="bolt"
                  selected={
                    p.keys.length === equipment.length &&
                    p.keys.every(k => equipment.includes(k))
                  }
                  onPress={() => setEquipment(p.keys)}
                />
              ))}
            </View>
            <View style={[styles.pad, styles.chips]}>
              {EQUIPMENT_OPTIONS.map(o => (
                <Chip
                  key={o.key}
                  label={o.label}
                  selected={equipment.includes(o.key)}
                  onPress={() => setEquipment(l => toggle(l, o.key))}
                />
              ))}
            </View>
          </Section>

          <TextField
            label="Infortuni o limitazioni"
            value={injuries}
            onChangeText={setInjuries}
            placeholder="Es. fastidio alla spalla destra"
            multiline
          />
          <TextField
            label="Esercizi da evitare"
            value={exclusions}
            onChangeText={setExclusions}
            placeholder="Es. stacco da terra, burpees"
          />
          <TextField
            label="Altre richieste"
            value={notes}
            onChangeText={setNotes}
            placeholder="Es. voglio allenare di più i glutei"
            multiline
          />
        </>
      ) : mode === 'convert' ? (
        <>
          <Card style={styles.card}>
            <T v="body">
              Hai una scheda su carta, in PDF o dal tuo coach? Genera il prompt,
              incollalo in una chat AI insieme alla foto o al file: ti
              restituirà la scheda pronta da importare, con gli esercizi
              collegati alle animazioni.
            </T>
          </Card>
          <Section>
            <Row
              title="Migliorala con l'AI"
              subtitle="Bilancia volumi e recuperi mantenendo la struttura"
              toggle={{ value: improve, onChange: setImprove }}
            />
            <Row
              title="Includi il mio profilo"
              subtitle="Età, peso, esperienza e limitazioni"
              toggle={{ value: includeProfile, onChange: setIncludeProfile }}
            />
          </Section>
          <TextField
            label="Richieste (facoltative)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Es. sostituisci la leg press con lo squat"
            multiline
          />
        </>
      ) : (
        <>
          <Card style={styles.card}>
            <T v="footnoteStrong" color="secondary">
              Scheda attuale
            </T>
            <T v="headline" style={styles.mt4}>
              {plan?.name}
            </T>
            <T v="subhead" color="secondary" style={styles.mt4}>
              Il prompt include la scheda e i tuoi ultimi risultati, così l’AI
              può aggiornare i carichi in modo realistico. Lo storico dei
              progressi resta intatto.
            </T>
          </Card>
          <View style={[styles.chips, styles.ideas]}>
            {MODIFY_IDEAS.map(i => (
              <Chip
                key={i}
                label={i}
                onPress={() =>
                  setRequest(r => (r.trim() ? `${r.trim()}\n${i}` : i))
                }
              />
            ))}
          </View>
          <TextField
            label="Cosa vuoi cambiare?"
            value={request}
            onChangeText={setRequest}
            placeholder="Descrivi le modifiche"
            multiline
          />
        </>
      )}
    </Screen>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stepTitle}>
      <View style={[styles.stepNum, { backgroundColor: c.accent }]}>
        <T v="footnoteStrong" color="onAccent">
          {n}
        </T>
      </View>
      <T v="headline">{title}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  pad: { padding: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  center: { justifyContent: 'center' },
  label: { marginBottom: 8 },
  stepTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stack: { gap: 10, marginTop: 14 },
  flex: { flex: 1 },
  manual: { minHeight: 140 },
  ideas: { marginBottom: 16 },
  mt4: { marginTop: 4 },
});
