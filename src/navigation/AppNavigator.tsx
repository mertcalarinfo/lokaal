import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LanguageSelectScreen from '../screens/onboarding/LanguageSelectScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const COLORS = {
  background: '#0A0A0F',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  textPrimary: '#FFFFFF',
};

const SplashScreen: React.FC = () => (
  <View style={splashStyles.container}>
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      style={splashStyles.logoIcon}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="mic" size={36} color="#fff" />
    </LinearGradient>
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
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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

  // If user has no language set (just registered), show language select
  if (!user.language) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      </Stack.Navigator>
    );
  }

  return <MainNavigator />;
};

export default AppNavigator;
