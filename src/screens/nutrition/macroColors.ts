/** Fixed hues for macronutrients, the same everywhere in the app. */
export const MACRO_COLOR = {
  protein: '#FF8A3D',
  carbs: '#2FA8FF',
  fat: '#B76BFF',
} as const;

export const MACRO_LABEL = {
  protein: 'Proteine',
  carbs: 'Carboidrati',
  fat: 'Grassi',
} as const;

export type MacroKey = keyof typeof MACRO_COLOR;
export const MACRO_KEYS: MacroKey[] = ['protein', 'carbs', 'fat'];
