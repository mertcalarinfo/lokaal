import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react-native';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { changeLanguage } from '../../i18n';
import Button from '../../components/Button';
import PrezenceLogo from '../../components/PrezenceLogo';
import { ThemeColors, F, R, S } from '../../theme';

type Language = 'en' | 'de';

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:      { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, paddingHorizontal: S.screen, paddingVertical: S.s6 },
  logoWrap:  { marginBottom: S.s10 },
  titleWrap: { marginBottom: S.s8 },
  title: {
    fontFamily: F.xBold, fontSize: 28, fontWeight: '800',
    color: T.text, letterSpacing: -0.56, marginBottom: S.s2, lineHeight: 32,
  },
  sub:  { fontFamily: F.regular, fontSize: 14.5, color: T.textMuted, lineHeight: 21 },
  cards: { flexDirection: 'row', gap: S.s4, flex: 1, alignItems: 'center' },
  card: {
    flex: 1, backgroundColor: T.surface,
    borderRadius: R.lg, padding: S.s6,
    alignItems: 'center', borderWidth: 1.5, borderColor: T.hairline,
    minHeight: 148, justifyContent: 'center',
  },
  cardActive: { borderColor: T.accent, backgroundColor: T.surfaceAccent },
  flag:      { fontSize: 36, marginBottom: S.s3 },
  langLabel: { fontFamily: F.bold, fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 3 },
  langSub:   { fontFamily: F.regular, fontSize: 13, color: T.textFaint },
  check:     { position: 'absolute', top: S.s3, right: S.s3 },
  footer:    { paddingBottom: S.s2 },
});

const LanguageSelectScreen: React.FC = () => {
  const navigation   = useNavigation();
  const { i18n }     = useTranslation();
  const { user, updateLanguage } = useAuth();
  const { T }        = useTheme();
  const styles       = useMemo(() => createStyles(T), [T]);

  const [selected, setSelected] = useState<Language>(
    i18n.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
  );
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await changeLanguage(selected);
      if (user) await updateLanguage(selected);
    } catch {
      Alert.alert('Error', 'Failed to save language preference. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const langs = [
    { code: 'en' as Language, label: 'English', sub: 'English', flag: '🇬🇧' },
    { code: 'de' as Language, label: 'Deutsch',  sub: 'German',  flag: '🇩🇪' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <PrezenceLogo size="sm" layout="horizontal" />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>
            {selected === 'de' ? 'Wähle deine Sprache' : 'Choose your language'}
          </Text>
          <Text style={styles.sub}>
            {selected === 'de'
              ? 'Du kannst dies später in den Einstellungen ändern'
              : 'You can change this later in Settings'}
          </Text>
        </View>

        <View style={styles.cards}>
          {langs.map((lang) => {
            const active = selected === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => setSelected(lang.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, active && { color: T.accent }]}>{lang.label}</Text>
                <Text style={styles.langSub}>{lang.sub}</Text>
                {active && (
                  <View style={styles.check}>
                    <CheckCircle2 size={20} color={T.accent} strokeWidth={1.7} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Button
            label={selected === 'de' ? 'Weiter' : 'Continue'}
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

export default LanguageSelectScreen;
