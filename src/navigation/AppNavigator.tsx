import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { HomeScreen } from '../screens/HomeScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { FormatScreen } from '../screens/FormatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SchemaScreen } from '../screens/SchemaScreen';
import { SyncScreen } from '../screens/SyncScreen';
import { ChartsScreen } from '../screens/ChartsScreen';
import { ValidatePlanScreen } from '../screens/ValidatePlanScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { palette, mode } = useTheme();
  const base: Theme = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.bg,
      card: palette.bgElevated,
      text: palette.text,
      border: palette.glassBorder,
      primary: palette.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{ animation: 'fade_from_bottom' }}
        />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Schema" component={SchemaScreen} />
        <Stack.Screen name="Import" component={ImportScreen} />
        <Stack.Screen name="Format" component={FormatScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Sync" component={SyncScreen} />
        <Stack.Screen name="Charts" component={ChartsScreen} />
        <Stack.Screen name="ValidatePlan" component={ValidatePlanScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
