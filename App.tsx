// Polyfill crypto.getRandomValues for React Native — must be the very first
// import so uuid (and any other library that calls getRandomValues) finds it.
import * as Crypto from 'expo-crypto';
if (typeof global.crypto === 'undefined' || typeof global.crypto.getRandomValues === 'undefined') {
  // @ts-ignore
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
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

// Initialize i18n before anything else
import './src/i18n';

// Initialize Firebase
import { isConfigured } from './src/services/firebase';

// Initialize RevenueCat
import { initRevenueCat } from './src/services/revenuecat';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { C } from './src/theme';

const FirebaseNotConfiguredBanner: React.FC = () => (
  <View style={bannerStyles.banner}>
    <Text style={bannerStyles.text}>
      ⚠️ Firebase not configured. Replace placeholder values in src/services/firebase.ts
    </Text>
  </View>
);

const bannerStyles = StyleSheet.create({
  banner: {
    backgroundColor: C.errorBg,
    borderBottomWidth: 1,
    borderBottomColor: C.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 11,
    color: C.error,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    initRevenueCat().catch((err) => {
      console.warn('RevenueCat init failed:', err);
    });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const firebaseConfigured = isConfigured;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary:      C.accent,
                background:   C.bg,
                card:         C.surface,
                text:         C.text,
                border:       C.hairline,
                notification: C.error,
              },
            }}
          >
            <StatusBar style="light" backgroundColor={C.bg} />
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
    backgroundColor: C.bg,
  },
});
