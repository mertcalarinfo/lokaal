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

const Stack = createNativeStackNavigator<RootStackParamList>();

const createSplashStyles = (T: ThemeColors) => StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: T.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  // P-Mark zentriert — Spec: dark P-warmwhite.png auf #0A1422, light P-navy.png auf #F4F1EA
  pMark: {
    width:        120,
    height:       120,
    marginBottom: 48,
  },
});

const SplashScreen: React.FC = () => {
  const { T, isDark } = useTheme();
  const styles = useMemo(() => createSplashStyles(T), [T]);

  // Theme-abhängige P-Mark-Datei
  const pSource = isDark
    ? require('../../assets/branding/P-warmwhite.png')
    : require('../../assets/branding/P-navy.png');

  return (
    <View style={styles.container}>
      <Image source={pSource} style={styles.pMark} resizeMode="contain" />
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
