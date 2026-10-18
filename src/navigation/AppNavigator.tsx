import React from 'react';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../data/store';
import { RootStackParams, SettingsStackParams } from './types';
import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DayScreen } from '../screens/DayScreen';
import { WorkoutScreen } from '../screens/workout/WorkoutScreen';
import { ExerciseInfoScreen } from '../screens/ExerciseInfoScreen';
import { ExerciseTrendScreen } from '../screens/ExerciseTrendScreen';
import { SessionScreen } from '../screens/SessionScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { PlanSetupScreen } from '../screens/plan/PlanSetupScreen';
import { AiFlowScreen } from '../screens/plan/AiFlowScreen';
import { ImportReviewScreen } from '../screens/plan/ImportReviewScreen';
import { PlanEditorScreen } from '../screens/plan/PlanEditorScreen';
import { ExerciseEditorScreen } from '../screens/plan/ExerciseEditorScreen';
import { ExercisePickerScreen } from '../screens/plan/ExercisePickerScreen';
import { PlansScreen } from '../screens/plan/PlansScreen';
import { BodyMetricScreen } from '../screens/body/BodyMetricScreen';
import { BodyScreen } from '../screens/body/BodyScreen';
import { WeighSettings } from '../screens/settings/WeighSettings';
import { NutritionSettings } from '../screens/settings/NutritionSettings';
import { HealthSettings } from '../screens/settings/HealthSettings';
import { FoodAddScreen } from '../screens/nutrition/FoodAddScreen';
import { CustomFoodScreen } from '../screens/nutrition/CustomFoodScreen';
import { ScannerScreen } from '../screens/nutrition/ScannerScreen';
import { SettingsHome } from '../screens/settings/SettingsHome';
import { ProfileEdit } from '../screens/settings/ProfileEdit';
import { WorkoutSettings } from '../screens/settings/WorkoutSettings';
import { NotificationSettings } from '../screens/settings/NotificationSettings';
import { ScaleSettings } from '../screens/settings/ScaleSettings';
import { AppearanceSettings } from '../screens/settings/AppearanceSettings';
import { DataSettings } from '../screens/settings/DataSettings';

/** Global ref, used outside React components (tests, notification taps). */
export const navigationRef = createNavigationContainerRef<RootStackParams>();

const Root = createNativeStackNavigator<RootStackParams>();
const SettingsStack = createNativeStackNavigator<SettingsStackParams>();

function SettingsNavigator() {
  const { c } = useTheme();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <SettingsStack.Screen name="SettingsHome" component={SettingsHome} />
      <SettingsStack.Screen name="ProfileEdit" component={ProfileEdit} />
      <SettingsStack.Screen
        name="WorkoutSettings"
        component={WorkoutSettings}
      />
      <SettingsStack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
      />
      <SettingsStack.Screen name="ScaleSettings" component={ScaleSettings} />
      <SettingsStack.Screen
        name="AppearanceSettings"
        component={AppearanceSettings}
      />
      <SettingsStack.Screen name="DataSettings" component={DataSettings} />
      <SettingsStack.Screen name="Body" component={BodyScreen} />
      <SettingsStack.Screen name="BodyMetric" component={BodyMetricScreen} />
      <SettingsStack.Screen name="WeighSettings" component={WeighSettings} />
      <SettingsStack.Screen
        name="NutritionSettings"
        component={NutritionSettings}
      />
      <SettingsStack.Screen name="HealthSettings" component={HealthSettings} />
    </SettingsStack.Navigator>
  );
}

export function AppNavigator() {
  const { c, dark } = useTheme();
  const onboarded = useStore(s => s.onboarded);
  const base = dark ? DarkTheme : DefaultTheme;
  const theme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.bg,
      card: c.card,
      text: c.label,
      border: c.separator,
      primary: c.accent,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Root.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'default',
        }}
      >
        {!onboarded ? (
          <Root.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Root.Screen name="Main" component={MainTabs} />
            <Root.Screen name="Day" component={DayScreen} />
            <Root.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Root.Screen name="ExerciseTrend" component={ExerciseTrendScreen} />
            <Root.Screen name="Session" component={SessionScreen} />
            <Root.Screen name="History" component={HistoryScreen} />
            <Root.Screen name="Plans" component={PlansScreen} />
            <Root.Screen name="ImportReview" component={ImportReviewScreen} />
            <Root.Screen
              name="ExerciseEditor"
              component={ExerciseEditorScreen}
            />
            <Root.Group screenOptions={{ presentation: 'modal' }}>
              <Root.Screen name="Settings" component={SettingsNavigator} />
              <Root.Screen name="ExerciseInfo" component={ExerciseInfoScreen} />
              <Root.Screen name="PlanSetup" component={PlanSetupScreen} />
              <Root.Screen
                name="ExercisePicker"
                component={ExercisePickerScreen}
              />
              <Root.Screen name="FoodAdd" component={FoodAddScreen} />
              <Root.Screen name="CustomFood" component={CustomFoodScreen} />
            </Root.Group>
            <Root.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Root.Screen name="AiFlow" component={AiFlowScreen} />
            <Root.Screen
              name="PlanEditor"
              component={PlanEditorScreen}
              options={{ gestureEnabled: false }}
            />
          </>
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
