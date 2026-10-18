import { NavigatorScreenParams } from '@react-navigation/native';
import { MealKey } from '../core/types';
import type { CompositionKey } from '../stats/body';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

export type BodyMetric = 'weight' | CompositionKey | `measure:${string}`;

export type SettingsStackParams = {
  SettingsHome: undefined;
  ProfileEdit: undefined;
  NotificationSettings: undefined;
  ScaleSettings: undefined;
  AppearanceSettings: undefined;
  WorkoutSettings: undefined;
  DataSettings: undefined;
  Body: undefined;
  BodyMetric: { metric: BodyMetric };
  WeighSettings: undefined;
  NutritionSettings: undefined;
  HealthSettings: undefined;
};

export type RootStackParams = {
  Onboarding: undefined;
  Main: undefined;
  Day: { dayId: string };
  Workout: undefined;
  ExerciseInfo: { catalogId?: string; name: string; key?: string };
  ExerciseTrend: { key: string; name: string };
  Session: { id: string };
  History: undefined;
  PlanSetup: undefined;
  AiFlow: { mode: 'create' | 'convert' | 'modify' };
  ImportReview: undefined;
  PlanEditor: undefined;
  ExerciseEditor: { dayId: string; blockId: string; exerciseId: string };
  ExercisePicker: { title?: string; cardio?: boolean };
  Plans: undefined;
  FoodAdd: { day: string; meal: MealKey; pickId?: string };
  CustomFood:
    | {
        id?: string;
        barcode?: string;
        day?: string;
        meal?: MealKey;
        name?: string;
      }
    | undefined;
  Scanner: { day: string; meal: MealKey };
  Settings: NavigatorScreenParams<SettingsStackParams> | undefined;
};

export type Nav = NativeStackNavigationProp<RootStackParams>;
export type ScreenProps<K extends keyof RootStackParams> =
  NativeStackScreenProps<RootStackParams, K>;
export type SettingsProps<K extends keyof SettingsStackParams> =
  NativeStackScreenProps<SettingsStackParams, K>;
