/**
 * Create or edit your own food from the label: values per 100 g / 100 ml,
 * an optional portion. A scanned barcode is attached so the next scan finds
 * it instantly, even offline.
 */
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { T } from '../../ui/Text';
import { TextField } from '../../ui/TextField';
import { Segmented } from '../../ui/Segmented';
import { Button } from '../../ui/Button';
import { Food } from '../../core/types';
import { kcalFromMacros } from '../../nutrition/foods';
import { parseDecimal } from '../../core/units';
import { fmtNum } from '../../core/format';
import { uid } from '../../core/ids';
import { ScreenProps } from '../../navigation/types';
import { toast } from '../../ui/Toast';

const str = (v?: number) => (v == null ? '' : fmtNum(v, 1));

export function CustomFoodScreen({
  route,
  navigation,
}: ScreenProps<'CustomFood'>) {
  const { id, barcode, day, meal, name: initialName } = route.params ?? {};
  const existing = useStore(s =>
    id ? s.foodLib.custom.find(f => f.id === id) : undefined,
  );
  const save = useStore(s => s.saveCustomFood);
  const remove = useStore(s => s.deleteCustomFood);

  const [name, setName] = useState(existing?.name ?? initialName ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [unit, setUnit] = useState<Food['unit']>(existing?.unit ?? 'g');
  const [kcal, setKcal] = useState(str(existing?.kcal));
  const [protein, setProtein] = useState(str(existing?.protein));
  const [carbs, setCarbs] = useState(str(existing?.carbs));
  const [fat, setFat] = useState(str(existing?.fat));
  const [fiber, setFiber] = useState(str(existing?.fiber));
  const [sugar, setSugar] = useState(str(existing?.sugar));
  const [salt, setSalt] = useState(str(existing?.salt));
  const [portionLabel, setPortionLabel] = useState(
    existing?.portions?.[0]?.label ?? '',
  );
  const [portionG, setPortionG] = useState(str(existing?.portions?.[0]?.g));
  const [packageG, setPackageG] = useState(str(existing?.packageG));

  const p = parseDecimal(protein) ?? 0;
  const c = parseDecimal(carbs) ?? 0;
  const f = parseDecimal(fat) ?? 0;
  const auto = kcalFromMacros(p, c, f);

  const submit = () => {
    if (!name.trim()) {
      Alert.alert('Manca il nome', 'Dai un nome all’alimento.');
      return;
    }
    const k = parseDecimal(kcal) ?? (p || c || f ? auto : null);
    if (k == null) {
      Alert.alert(
        'Mancano i valori',
        'Inserisci almeno le calorie, oppure proteine, carboidrati e grassi.',
      );
      return;
    }
    const pg = parseDecimal(portionG);
    const food: Food = {
      id: existing?.id ?? (barcode ? `c:${barcode}` : uid('c')),
      name: name.trim(),
      brand: brand.trim() || undefined,
      unit,
      kcal: Math.round(k),
      protein: p,
      carbs: c,
      fat: f,
      fiber: parseDecimal(fiber) ?? undefined,
      sugar: parseDecimal(sugar) ?? undefined,
      salt: parseDecimal(salt) ?? undefined,
      portions:
        pg && pg > 0
          ? [{ label: portionLabel.trim() || 'porzione', g: pg }]
          : undefined,
      packageG: parseDecimal(packageG) ?? undefined,
      barcode: existing?.barcode ?? barcode,
      source: 'custom',
    };
    save(food);
    toast(existing ? 'Alimento aggiornato' : 'Alimento creato');
    if (day && meal)
      navigation.popTo('FoodAdd', { day, meal, pickId: food.id });
    else navigation.goBack();
  };

  const per = unit === 'ml' ? '100 ml' : '100 g';

  return (
    <Screen
      title={existing ? 'Modifica alimento' : 'Nuovo alimento'}
      eyebrow={barcode ? `Codice ${barcode}` : undefined}
      close
      keyboard
    >
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        placeholder="Es. Yogurt greco alla vaniglia"
      />
      <TextField
        label="Marca (facoltativa)"
        value={brand}
        onChangeText={setBrand}
      />
      <View style={styles.seg}>
        <Segmented
          options={[
            { key: 'g', label: 'Solido (g)' },
            { key: 'ml', label: 'Liquido (ml)' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </View>

      <T v="footnoteStrong" color="secondary" style={styles.head}>
        Valori per {per}
      </T>
      <View style={styles.grid}>
        <Num label="Proteine (g)" value={protein} onChange={setProtein} />
        <Num label="Carboidrati (g)" value={carbs} onChange={setCarbs} />
        <Num label="Grassi (g)" value={fat} onChange={setFat} />
        <Num
          label="Calorie (kcal)"
          value={kcal}
          onChange={setKcal}
          placeholder={p || c || f ? String(auto) : ''}
        />
      </View>
      {!kcal && (p || c || f) ? (
        <T v="footnote" color="secondary" style={styles.note}>
          Se lasci vuote le calorie uso {auto} kcal, calcolate dai macro.
        </T>
      ) : null}
      <View style={styles.grid}>
        <Num label="Fibre (g)" value={fiber} onChange={setFiber} />
        <Num label="Zuccheri (g)" value={sugar} onChange={setSugar} />
        <Num label="Sale (g)" value={salt} onChange={setSalt} />
      </View>

      <T v="footnoteStrong" color="secondary" style={styles.head}>
        PORZIONE E CONFEZIONE (FACOLTATIVE)
      </T>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <TextField
            label="Porzione"
            value={portionLabel}
            onChangeText={setPortionLabel}
            placeholder="vasetto"
          />
        </View>
        <Num label={`Peso (${unit})`} value={portionG} onChange={setPortionG} />
        <Num
          label={`Confezione (${unit})`}
          value={packageG}
          onChange={setPackageG}
        />
      </View>

      <Button
        title={existing ? 'Salva' : 'Crea alimento'}
        icon="check"
        onPress={submit}
        style={styles.cta}
      />
      {existing ? (
        <Button
          title="Elimina alimento"
          icon="trash"
          variant="plain"
          onPress={() => {
            remove(existing.id);
            navigation.goBack();
          }}
        />
      ) : null}
    </Screen>
  );
}

function Num({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.cell}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '0'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { marginBottom: 18 },
  head: { marginLeft: 16, marginBottom: 8, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', paddingHorizontal: 5 },
  note: { marginHorizontal: 16, marginTop: -6, marginBottom: 12 },
  cta: { marginTop: 12 },
});
