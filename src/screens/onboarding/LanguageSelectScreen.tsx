import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { changeLanguage } from '../../i18n';
import Button from '../../components/Button';

const COLORS = {
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C26',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  textMuted: '#4A4A5E',
  border: '#2A2A3A',
};

type Language = 'en' | 'de';

const LanguageSelectScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateLanguage } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await changeLanguage(selectedLanguage);
      if (user) {
        await updateLanguage(selectedLanguage);
      }
      // Navigation is handled by AppNavigator based on auth state
      // Just navigating back will trigger AppNavigator to show the main app
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save language preference. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const languages: { code: Language; label: string; sublabel: string; flag: string }[] = [
    { code: 'en', label: 'English', sublabel: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', sublabel: 'German', flag: '🇩🇪' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.logoIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="mic" size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>PREZENCE</Text>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {selectedLanguage === 'de' ? 'Wähle deine Sprache' : 'Choose your language'}
          </Text>
          <Text style={styles.subtitle}>
            {selectedLanguage === 'de'
              ? 'Du kannst dies später in den Einstellungen ändern'
              : 'You can change this later in settings'}
          </Text>
        </View>

        {/* Language cards */}
        <View style={styles.languageCards}>
          {languages.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageCard, isSelected && styles.languageCardSelected]}
                onPress={() => setSelectedLanguage(lang.code)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <LinearGradient
                    colors={['rgba(108,99,255,0.15)', 'rgba(108,99,255,0.05)']}
                    style={StyleSheet.absoluteFillObject}
                    borderRadius={16}
                  />
                )}
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[styles.languageLabel, isSelected && styles.languageLabelSelected]}>
                  {lang.label}
                </Text>
                <Text style={styles.languageSublabel}>{lang.sublabel}</Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue button */}
        <View style={styles.footer}>
          <Button
            label={selectedLanguage === 'de' ? 'Weiter' : 'Continue'}
            onPress={handleContinue}
            loading={loading}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 3,
  },
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  languageCards: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    alignItems: 'center',
  },
  languageCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 160,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  languageCardSelected: {
    borderColor: COLORS.primary,
  },
  languageFlag: {
    fontSize: 40,
    marginBottom: 12,
  },
  languageLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  languageLabelSelected: {
    color: COLORS.primary,
  },
  languageSublabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  footer: {
    paddingBottom: 8,
  },
});

export default LanguageSelectScreen;
