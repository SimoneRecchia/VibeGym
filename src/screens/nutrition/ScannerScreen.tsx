/**
 * Food scanner, all on the device:
 *  - Codice: point at the barcode, the product comes from your foods or
 *    Open Food Facts, then pick the quantity.
 *  - Foto: shoot the label or the plate. A barcode in the photo (even the
 *    package behind the plate) is looked up; otherwise the product name is
 *    read from the label and the foods in the photo are suggested.
 * Unknown products can be created from the label and are found instantly
 * next time.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, type CameraApi } from 'react-native-camera-kit';
import { analyzeImage, visionAvailable } from 'vibe-vision';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Glass } from '../../ui/Glass';
import { IconButton, Button } from '../../ui/Button';
import { T } from '../../ui/Text';
import { Tap } from '../../ui/Pressable';
import { Sheet } from '../../ui/Sheet';
import { Chip } from '../../ui/Chip';
import { toast } from '../../ui/Toast';
import { haptic } from '../../services/haptics';
import { Food } from '../../core/types';
import {
  GENERIC,
  MEAL_LABEL,
  normalize,
  searchFoods,
} from '../../nutrition/foods';
import { fetchProduct, searchProducts } from '../../nutrition/off';
import { PhotoFindings, interpretPhoto } from '../../nutrition/photo';
import { fmtNum } from '../../core/format';
import { ScreenProps } from '../../navigation/types';
import { FoodEntrySheet } from './FoodEntrySheet';

type Perm = 'unknown' | 'granted' | 'denied';
type Mode = 'code' | 'photo';

const FOOD_CODES = ['ean-13', 'ean-8', 'upc-a', 'upc-e'] as const;

export function ScannerScreen({ route, navigation }: ScreenProps<'Scanner'>) {
  const { day, meal } = route.params;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const lib = useStore(s => s.foodLib);
  const logFood = useStore(s => s.logFood);
  const cacheFood = useStore(s => s.cacheFood);
  const camera = useRef<CameraApi>(null);
  const [perm, setPerm] = useState<Perm>(
    Platform.OS === 'ios' ? 'granted' : 'unknown',
  );
  const [mode, setMode] = useState<Mode>('code');
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [food, setFood] = useState<Food | null>(null);
  const [findings, setFindings] = useState<PhotoFindings | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Fotocamera',
      message:
        'Serve per leggere il codice a barre e l’etichetta degli alimenti. Le immagini restano sul telefono.',
      buttonPositive: 'Consenti',
    })
      .then(r =>
        setPerm(
          r === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
        ),
      )
      .catch(() => setPerm('denied'));
  }, []);

  const lookup = async (raw: string) => {
    const code = raw.replace(/\D/g, '');
    if (code.length < 6 || food || handled.current === code) return;
    handled.current = code;
    haptic('success');
    const local =
      lib.custom.find(f => f.barcode === code) ??
      lib.cache.find(f => f.barcode === code || f.id === `off:${code}`);
    if (local) {
      setFood(local);
      return;
    }
    setBusy(true);
    const r = await fetchProduct(code);
    setBusy(false);
    if (r.status === 'found') {
      cacheFood(r.food);
      setFood(r.food);
      return;
    }
    const create = () =>
      navigation.replace('CustomFood', {
        barcode: code,
        day,
        meal,
        name: r.status === 'incomplete' ? r.name : undefined,
      });
    Alert.alert(
      r.status === 'offline'
        ? 'Sei offline'
        : r.status === 'incomplete'
        ? 'Mancano i valori nutrizionali'
        : 'Prodotto non trovato',
      r.status === 'offline'
        ? 'Per cercare il prodotto serve internet. Puoi crearlo subito con i valori dell’etichetta.'
        : r.status === 'incomplete'
        ? `«${
            r.name ?? 'Questo prodotto'
          }» è su Open Food Facts ma senza valori. Inseriscili dall’etichetta: la prossima volta lo trovi subito.`
        : 'Il codice non è ancora su Open Food Facts. Crealo con i valori dell’etichetta: la prossima volta lo trovi subito.',
      [
        {
          text: 'Riprova',
          style: 'cancel',
          onPress: () => (handled.current = null),
        },
        { text: 'Crea alimento', onPress: create },
      ],
    );
  };

  const shoot = async () => {
    if (busy || !camera.current) return;
    setBusy(true);
    try {
      const { uri } = await camera.current.capture();
      const f = interpretPhoto(await analyzeImage(uri));
      setBusy(false);
      haptic('light');
      if (f.barcode) {
        handled.current = null;
        lookup(f.barcode);
      } else setFindings(f);
    } catch {
      setBusy(false);
      Alert.alert('Foto non analizzata', 'Riprova inquadrando da più vicino.');
    }
  };

  const frameW = mode === 'code' ? 280 : 300;
  const frameH = mode === 'code' ? 170 : 300;

  return (
    <View style={styles.root}>
      {perm === 'granted' ? (
        <Camera
          ref={camera as any}
          style={StyleSheet.absoluteFill}
          scanBarcode={mode === 'code'}
          allowedBarcodeTypes={[...FOOD_CODES]}
          onReadCode={e => lookup(e.nativeEvent.codeStringValue)}
          scanThrottleDelay={800}
          torchMode={torch ? 'on' : 'off'}
          zoomMode="on"
          shutterPhotoSound={false}
        />
      ) : null}

      {/* Viewfinder */}
      <View pointerEvents="none" style={styles.center}>
        <View style={[styles.frame, { width: frameW, height: frameH }]}>
          {busy ? <ActivityIndicator color="#fff" size="large" /> : null}
        </View>
        <T v="subheadStrong" color="#fff" align="center" style={styles.hint}>
          {perm === 'denied'
            ? 'Consenti l’uso della fotocamera per scansionare'
            : busy
            ? mode === 'code'
              ? 'Cerco il prodotto…'
              : 'Analizzo la foto…'
            : mode === 'code'
            ? 'Inquadra il codice a barre'
            : 'Fotografa l’etichetta, il prodotto o il piatto'}
        </T>
        <T v="footnote" color="rgba(255,255,255,0.7)" align="center">
          Si aggiunge a {MEAL_LABEL[meal].toLowerCase()}
        </T>
      </View>

      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="xmark"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Chiudi"
        />
        <IconButton
          icon="bolt"
          tint={torch ? c.yellow : undefined}
          color={torch ? '#000' : undefined}
          onPress={() => setTorch(t => !t)}
          accessibilityLabel={torch ? 'Spegni la torcia' : 'Accendi la torcia'}
        />
      </View>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {perm === 'denied' ? (
          <Button
            title="Apri le impostazioni"
            icon="gear"
            variant="glass"
            onPress={() => Linking.openSettings()}
          />
        ) : typing ? (
          <Glass style={styles.typeBox}>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder="Numeri sotto il codice a barre"
              placeholderTextColor={c.tertiary}
              keyboardType="number-pad"
              autoFocus
              style={[styles.typeInput, { color: c.label }]}
              onSubmitEditing={() => lookup(typed)}
              returnKeyType="search"
            />
            <IconButton
              icon="search"
              plain
              size={40}
              tint={c.accent}
              color={c.onAccent}
              onPress={() => lookup(typed)}
              accessibilityLabel="Cerca il codice"
            />
          </Glass>
        ) : (
          <>
            {mode === 'photo' ? (
              <Tap
                onPress={shoot}
                disabled={busy}
                style={styles.shutterWrap}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel="Scatta la foto"
              >
                <View style={styles.shutter}>
                  <View style={styles.shutterInner} />
                </View>
              </Tap>
            ) : null}
            {visionAvailable ? (
              <Glass style={styles.modes}>
                {(['code', 'photo'] as Mode[]).map(m => (
                  <Tap
                    key={m}
                    onPress={() => setMode(m)}
                    style={styles.modeItem}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === m }}
                  >
                    <View
                      style={[
                        styles.modeInner,
                        mode === m && { backgroundColor: c.fill2 },
                      ]}
                    >
                      <T
                        v="subheadStrong"
                        color={mode === m ? 'label' : 'secondary'}
                      >
                        {m === 'code' ? 'Codice a barre' : 'Foto'}
                      </T>
                    </View>
                  </Tap>
                ))}
              </Glass>
            ) : null}
            {mode === 'code' ? (
              <Button
                title="Inserisci il codice a mano"
                icon="pencil"
                variant="glass"
                onPress={() => setTyping(true)}
              />
            ) : null}
          </>
        )}
      </View>

      <FindingsSheet
        findings={findings}
        onClose={() => setFindings(null)}
        onPick={f => {
          setFindings(null);
          setFood(f);
        }}
        onSearch={() => {
          setFindings(null);
          navigation.replace('FoodAdd', { day, meal });
        }}
      />

      <FoodEntrySheet
        visible={!!food}
        onClose={() => {
          setFood(null);
          handled.current = null;
        }}
        food={food}
        mode="add"
        initial={{ qty: 100, meal }}
        onSubmit={v => {
          if (!food) return;
          logFood({ day, meal: v.meal, food, qty: v.qty, portion: v.portion });
          toast(`${food.name} aggiunto a ${MEAL_LABEL[v.meal].toLowerCase()}`);
          setFood(null);
          navigation.goBack();
        }}
      />
    </View>
  );
}

/** What the photo showed: label text and recognised foods. */
function FindingsSheet({
  findings,
  onClose,
  onPick,
  onSearch,
}: {
  findings: PhotoFindings | null;
  onClose: () => void;
  onPick: (f: Food) => void;
  onSearch: () => void;
}) {
  const { c } = useTheme();
  const lib = useStore(s => s.foodLib);
  const cacheFood = useStore(s => s.cacheFood);
  const [online, setOnline] = useState<Food[] | 'loading' | 'error' | null>(
    null,
  );
  const query = findings?.query;

  // OCR text is noisy: try all its words, then fewer, until something matches.
  const local = useMemo(() => {
    if (!query) return [];
    const pool = [...lib.custom, ...lib.cache, ...GENERIC];
    const words = normalize(query)
      .split(' ')
      .filter(w => w.length >= 3);
    for (let n = words.length; n >= 1; n--) {
      const r = searchFoods(words.slice(0, n).join(' '), pool, 6);
      if (r.length) return r;
    }
    return [];
  }, [query, lib]);

  useEffect(() => {
    setOnline(null);
    if (!query) return;
    let alive = true;
    setOnline('loading');
    searchProducts(query)
      .then(r => alive && setOnline(r.slice(0, 8)))
      .catch(() => alive && setOnline('error'));
    return () => {
      alive = false;
    };
  }, [query]);

  const nothing = findings && !query && !findings.foods.length;
  const products = Array.isArray(online) ? online : [];

  return (
    <Sheet
      visible={!!findings}
      onClose={onClose}
      title={nothing ? 'Niente di riconoscibile' : 'Cosa ho trovato'}
      subtitle={query ? `Dall’etichetta: «${query}»` : undefined}
      scroll
    >
      {findings?.downloading ? (
        <T v="footnote" color="secondary" style={styles.note}>
          Il modello per leggere le foto si sta scaricando da Google Play
          Services: tra un minuto i risultati saranno completi.
        </T>
      ) : null}

      {findings?.foods.length ? (
        <>
          <T v="footnoteStrong" color="secondary" style={styles.head}>
            NELLA FOTO
          </T>
          <View style={styles.chips}>
            {findings.foods.map(f => (
              <Chip
                key={f.id}
                label={f.name}
                tinted
                onPress={() => onPick(f)}
              />
            ))}
          </View>
        </>
      ) : null}

      {query ? (
        <>
          <T v="footnoteStrong" color="secondary" style={styles.head}>
            PRODOTTI
          </T>
          {online === 'loading' ? (
            <ActivityIndicator color={c.accent} style={styles.loading} />
          ) : null}
          {[...products, ...local].map(f => (
            <Tap
              key={f.id}
              onPress={() => {
                cacheFood(f);
                onPick(f);
              }}
              scaleTo={0.98}
            >
              <View style={[styles.result, { borderBottomColor: c.separator }]}>
                <View style={styles.flex}>
                  <T v="body" numberOfLines={1}>
                    {f.name}
                  </T>
                  <T v="footnote" color="secondary" numberOfLines={1}>
                    {f.brand ??
                      (f.source === 'generic' ? 'Alimento comune' : 'Prodotto')}
                  </T>
                </View>
                <T v="subheadStrong">{fmtNum(f.kcal, 0)} kcal</T>
              </View>
            </Tap>
          ))}
          {online === 'error' ? (
            <T v="footnote" color="secondary" style={styles.note}>
              Senza connessione cerco solo tra gli alimenti salvati.
            </T>
          ) : null}
        </>
      ) : null}

      {nothing ? (
        <T v="subhead" color="secondary" style={styles.note}>
          Avvicinati all’etichetta o al codice a barre, oppure cerca l’alimento
          per nome.
        </T>
      ) : null}
      <Button
        title="Cerca per nome"
        icon="search"
        variant="tinted"
        onPress={onSearch}
        style={styles.searchBtn}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1, minWidth: 0 },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  frame: {
    borderColor: '#fff',
    borderWidth: 3,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hint: { marginHorizontal: 32 },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  bottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    gap: 14,
    alignItems: 'stretch',
  },
  shutterWrap: { alignSelf: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  modes: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    alignSelf: 'center',
  },
  modeItem: { minWidth: 130 },
  modeInner: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  typeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingLeft: 18,
    paddingRight: 8,
    height: 56,
    gap: 8,
  },
  typeInput: { flex: 1, fontSize: 17 },
  head: { marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loading: { marginVertical: 12 },
  note: { marginVertical: 8 },
  searchBtn: { marginTop: 16 },
});
