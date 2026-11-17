// Polyfill crypto.getRandomValues for React Native — must be the very first
// import so uuid (and any other library that calls getRandomValues) finds it.
import * as Crypto from 'expo-crypto';
if (typeof global.crypto === 'undefined' || typeof global.crypto.getRandomValues === 'undefined') {
  // @ts-ignore
  global.crypto = {
    getRandomValues: (array: any) => Crypto.getRandomValues(array),
  };
}

// Install the global error handler + boundary BEFORE the i18n / firebase module
// imports below, so their load-time errors are captured too (not just render
// errors). In a release build this turns a silent startup crash into a visible
// error screen.
import { StartupErrorBoundary } from './src/components/StartupErrorBoundary';

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

// Initialize i18n before anything else
import './src/i18n';

// Initialize Firebase
import { isConfigured } from './src/services/firebase';

// Initialize RevenueCat
import { initRevenueCat } from './src/services/revenuecat';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { lightPalette as C } from './src/theme';

// ─── Firebase-Banner (benötigt keinen Theme-Kontext) ─────────────────────────

const FirebaseNotConfiguredBanner: React.FC = () => (
  <View style={bannerStyles.banner}>
    <Text style={bannerStyles.text}>
      ⚠️ Firebase not configured. Replace placeholder values in src/services/firebase.ts
    </Text>
  </View>
);

const bannerStyles = StyleSheet.create({
  banner: {
    backgroundColor: C.disabledBg,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 11,
    color: C.text,
    textAlign: 'center',
    lineHeight: 16,
  },
});

// ─── Inner App — hat Zugriff auf ThemeContext ─────────────────────────────────

const AppContent: React.FC = () => {
  const { T, isDark } = useTheme();

  const firebaseConfigured = isConfigured;

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary:      T.accent,
          background:   T.bg,
          card:         T.card,
          text:         T.text,
          border:       T.hairline,
          notification: T.accent,
        },
      }}
    >
      {/* StatusBar: hell auf dunklem Theme, dunkel auf hellem Theme */}
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={T.bg} />
      {!firebaseConfigured && <FirebaseNotConfiguredBanner />}
      <AppNavigator />
    </NavigationContainer>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    initRevenueCat().catch((err) => {
      console.warn('RevenueCat init failed:', err);
    });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <StartupErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </StartupErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
