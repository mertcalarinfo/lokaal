import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { AuthStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import AmbientBackground from '../../components/AmbientBackground';
import GlassIconButton from '../../components/GlassIconButton';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

type AccessNav = NativeStackNavigationProp<AuthStackParamList, 'AccessCode'>;

const AccessCodeScreen: React.FC = () => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t }      = useTranslation();
  const navigation = useNavigation<AccessNav>();
  const { user, redeemCodeNow, stageAccessCode } = useAuth();

  const [code,  setCode]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info,  setInfo]  = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    const c = code.trim().toUpperCase();
    if (!c || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (user) {
        // Eingeloggt → sofort einlösen. Erfolgsmeldung erscheint als Modal (via AuthContext).
        const res = await redeemCodeNow(c);
        if (res.success) {
          navigation.goBack();
        } else if (res.reason === 'invalid') {
          setError(t('access.errorInvalid'));
        } else if (res.reason === 'used') {
          setError(t('access.errorUsed'));
        } else {
          setError(t('access.errorGeneric'));
        }
      } else {
        // Nicht eingeloggt → Code zwischenspeichern, Einlösung nach Anmeldung.
        await stageAccessCode(c);
        setInfo(t('access.staged'));
        setTimeout(() => navigation.goBack(), 1600);
      }
    } catch {
      setError(t('access.errorGeneric'));
    } finally {
      setBusy(false);
    }
  }, [code, busy, user, redeemCodeNow, stageAccessCode, navigation, t]);

  return (
    <View style={S.safe}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={S.head}>
            <GlassIconButton icon="back" onPress={() => navigation.goBack()} accessibilityLabel={t('progress.back')} />
          </View>

          <View style={S.body}>
            <Text style={S.title} accessibilityRole="header">{t('access.title')}</Text>
            <Text style={S.hint}>{t('access.hint')}</Text>
            <Card style={S.card}>
              <TextInput
                style={S.input}
                value={code}
                onChangeText={(v) => { setCode(v); if (error) setError(null); }}
                placeholder={t('access.placeholder')}
                placeholderTextColor={T.disabledText}
                selectionColor={T.accent}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                editable={!busy}
                onSubmitEditing={onSubmit}
                returnKeyType="done"
              />
              {error && <Text style={S.error}>{error}</Text>}
              {info  && <Text style={S.info}>{info}</Text>}
              <Button
                label={t('access.redeem')}
                onPress={onSubmit}
                disabled={!code.trim()}
                loading={busy}
                fullWidth
                style={{ marginTop: 16 }}
              />
            </Card>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default AccessCodeScreen;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:  { flex: 1, backgroundColor: T.bg },
  head:  { paddingHorizontal: SP.screen, paddingTop: SP.top, minHeight: 44, flexDirection: 'row' },
  body:  { paddingHorizontal: SP.screen, paddingTop: 20, gap: 6 },
  title: { ...TY.pageTitle, color: T.text },
  hint:  { ...TY.body, color: T.textSecondary, marginBottom: 14 },
  card:  { padding: 18 },
  input: {
    fontFamily: F.medium,
    fontSize: 18,
    letterSpacing: 2,
    color: T.text,
    minHeight: 52,
    borderWidth: 1,
    borderColor: T.cardBorder,
    borderRadius: R.button,
    paddingHorizontal: 16,
  },
  error: { fontFamily: F.medium, fontSize: 13, color: T.text, marginTop: 10 },
  info:  { fontFamily: F.medium, fontSize: 13, color: T.accentText, marginTop: 10 },
});
