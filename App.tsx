import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { StoreProvider, useStore } from './src/lib/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Toast } from './src/components/Toast';
import { RestTimer } from './src/components/RestTimer';
import { WeightPrompt } from './src/components/WeightPrompt';

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StoreProvider>
            <Root />
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const { palette, mode } = useTheme();
  const { toast } = useStore();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <AppNavigator />
      <RestTimer />
      <WeightPrompt />
      <Toast message={toast} />
    </View>
  );
}

export default App;
