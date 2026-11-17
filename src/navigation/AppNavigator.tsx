import React, { useEffect, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LanguageSelectScreen from '../screens/onboarding/LanguageSelectScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { ThemeColors } from '../theme';
import AmbientBackground from '../components/AmbientBackground';

const Stack = createNativeStackNavigator<RootStackParamList>();

const createSplashStyles = (T: ThemeColors) => StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: T.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  // Splash (Entwurf 5): bg + blaues P, kein Navy mehr
  pMark: {
    width:        116,
    height:       96,
    marginBottom: 48,
  },
});

const SplashScreen: React.FC = () => {
  const { T } = useTheme();
  const styles = useMemo(() => createSplashStyles(T), [T]);

  return (
    <View style={styles.container}>
      <AmbientBackground animated={false} />
      <Image source={require('../../assets/branding/p-logo.png')} style={styles.pMark} resizeMode="contain" />
      <ActivityIndicator size="small" color={T.accent} />
    </View>
  );
};

const AppNavigator: React.FC = () => {
  const { user, loading, skipLogin } = useAuth();
  const { T } = useTheme();

  // DEV ONLY — bypass entire auth flow on web for design/UI testing
  useEffect(() => {
    if (Platform.OS === 'web') {
      skipLogin();
    }
  }, []);

  if (loading || user === undefined) {
    return <SplashScreen />;
  }

  if (user === null || !user) {
    return <AuthNavigator />;
  }

  if (!user.language) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      </Stack.Navigator>
    );
  }

  if (!user.onboardingCompleted) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
        <Stack.Screen name="OnboardingIntro" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  return <MainNavigator />;
};

export default AppNavigator;
