import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { ProfileFields } from '../components/ProfileFields';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Profilo</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <Text style={[styles.intro, { color: palette.textDim }]}>
          Questi dati restano sul dispositivo. Tutti i campi sono opzionali.
        </Text>
        <ProfileFields />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: { ...typography.title2 },
  intro: { ...typography.subhead, marginBottom: space.md },
});
