// Polyfill crypto.getRandomValues for React Native — must be the very first
// import so uuid (and any other library that calls getRandomValues) finds it.
import * as Crypto from 'expo-crypto';
if (typeof global.crypto === 'undefined' || typeof global.crypto.getRandomValues === 'undefined') {
  // @ts-ignore — assigning to the global crypto object
  global.crypto = {
    getRandomValues: (array: any) => Crypto.getRandomValues(array),
  };
}

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text } from 'react-native';
import { useFonts, DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

// Initialize i18n before anything else
import './src/i18n';

// Initialize Firebase
import { isConfigured } from './src/services/firebase';

// Initialize RevenueCat
import { initRevenueCat } from './src/services/revenuecat';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

const COLORS = {
  background: '#0a1628',
  surface: '#0d1b2e',
  primary: '#3B7FE8',
  accent: '#FF6B6B',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  border: 'rgba(59,127,232,0.25)',
};

const FirebaseNotConfiguredBanner: React.FC = () => (
  <View style={bannerStyles.banner}>
    <Text style={bannerStyles.text}>
      ⚠️ Firebase not configured. Replace placeholder values in src/services/firebase.ts
    </Text>
  </View>
);

const bannerStyles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,107,0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 11,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'DMSans_400Regular',
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
  });

  useEffect(() => {
    // Initialize RevenueCat on app start
    initRevenueCat().catch((err) => {
      console.warn('RevenueCat init failed:', err);
    });
  }, []);

  // Keep native splash visible until fonts are ready
  if (!fontsLoaded) {
    return null;
  }

  const firebaseConfigured = isConfigured;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* AuthProvider wraps NavigationContainer so every screen — including
            AppNavigator — shares one auth state instance. This is what fixes
            the onboarding loop: markOnboardingCompleted() now updates the same
            user object that AppNavigator reads, triggering an immediate re-render. */}
        <AuthProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: COLORS.primary,
                background: COLORS.background,
                card: COLORS.surface,
                text: COLORS.textPrimary,
                border: COLORS.border,
                notification: COLORS.accent,
              },
            }}
          >
            <StatusBar style="light" backgroundColor="#0a1628" />
            {!firebaseConfigured && <FirebaseNotConfiguredBanner />}
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
