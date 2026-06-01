import React, { useEffect, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LanguageSelectScreen from '../screens/onboarding/LanguageSelectScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { ThemeColors, F } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const createSplashStyles = (T: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 20,
  },
  appName: {
    fontFamily:    F.xBold,
    fontSize:      28,
    fontWeight:    '800',
    color:         T.text,
    letterSpacing: 5,
  },
});

const SplashScreen: React.FC = () => {
  const { T } = useTheme();
  const styles = useMemo(() => createSplashStyles(T), [T]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>PREZENCE</Text>
      <ActivityIndicator
        size="small"
        color={T.accent}
        style={{ marginTop: 48 }}
      />
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
