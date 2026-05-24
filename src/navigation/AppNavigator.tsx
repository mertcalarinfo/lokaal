import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LanguageSelectScreen from '../screens/onboarding/LanguageSelectScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const COLORS = {
  background: '#000000',
  primary: '#3B7FE8',
  textPrimary: '#FFFFFF',
};

const SplashScreen: React.FC = () => (
  <View style={splashStyles.container}>
    <Image
      source={require('../../assets/logo.png')}
      style={splashStyles.logo}
      resizeMode="contain"
    />
    <Text style={splashStyles.appName}>PREZENCE</Text>
    <ActivityIndicator
      size="small"
      color={COLORS.primary}
      style={{ marginTop: 48 }}
    />
  </View>
);

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 5,
  },
});

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  // Step 1: New user must choose app language
  if (!user.language) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      </Stack.Navigator>
    );
  }

  // Step 2: Must complete the 3-step onboarding (purpose / video language / focus area)
  if (!user.onboardingCompleted) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OnboardingIntro" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  return <MainNavigator />;
};

export default AppNavigator;
