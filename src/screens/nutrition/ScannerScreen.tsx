/**
 * Barcode scanner: point at the code, the product comes from your foods or
 * Open Food Facts, then pick the quantity. Unknown products can be created
 * from the label and are found instantly next time.
 */
import React, { useEffect, useRef, useState } from 'react';
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
import { Camera } from 'react-native-camera-kit';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Glass } from '../../ui/Glass';
import { IconButton, Button } from '../../ui/Button';
import { T } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { haptic } from '../../services/haptics';
import { Food } from '../../core/types';
import { MEAL_LABEL } from '../../nutrition/foods';
import { fetchProduct } from '../../nutrition/off';
import { ScreenProps } from '../../navigation/types';
import { FoodEntrySheet } from './FoodEntrySheet';

type Perm = 'unknown' | 'granted' | 'denied';

const FOOD_CODES = ['ean-13', 'ean-8', 'upc-a', 'upc-e'] as const;

export function ScannerScreen({ route, navigation }: ScreenProps<'Scanner'>) {
  const { day, meal } = route.params;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const lib = useStore(s => s.foodLib);
  const logFood = useStore(s => s.logFood);
  const cacheFood = useStore(s => s.cacheFood);
  const [perm, setPerm] = useState<Perm>(
    Platform.OS === 'ios' ? 'granted' : 'unknown',
  );
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [food, setFood] = useState<Food | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Fotocamera',
      message:
        'Serve per leggere il codice a barre degli alimenti. Le immagini restano sul telefono.',
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
    if (code.length < 6 || busy || food || handled.current === code) return;
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

  const frameW = 280;
  const frameH = 170;

  return (
    <View style={styles.root}>
      {perm === 'granted' ? (
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
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
            ? 'Cerco il prodotto…'
            : 'Inquadra il codice a barre'}
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
          <Button
            title="Inserisci il codice a mano"
            icon="pencil"
            variant="glass"
            onPress={() => setTyping(true)}
          />
        )}
      </View>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
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
});
