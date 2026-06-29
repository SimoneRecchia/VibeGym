import { Plan } from '../lib/types';

export type RootStackParamList = {
  Home: undefined;
  Workout: undefined;
  History: undefined;
  Menu: undefined;
  Schema: undefined;
  Import: undefined;
  Format: undefined;
  Settings: undefined;
  Profile: undefined;
  Sync: undefined;
  Charts: undefined;
  ValidatePlan: { plan: Plan };
};
