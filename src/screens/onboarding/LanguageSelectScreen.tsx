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
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { changeLanguage } from '../../i18n';
import Button from '../../components/Button';
import PrezenceLogo from '../../components/PrezenceLogo';

const COLORS = {
  background: '#000000',
  surface: '#0a0f1e',
  surfaceElevated: '#111827',
  primary: '#3B7FE8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  textMuted: '#4a5568',
  border: '#1a2235',
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
    } catch {
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
          <PrezenceLogo size="sm" layout="horizontal" />
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
    marginBottom: 48,
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
  },
  languageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#0d1a35',
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
