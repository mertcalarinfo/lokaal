import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { AuthStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import PrezenceLogo from '../../components/PrezenceLogo';
import { ThemeColors, F, R, S } from '../../theme';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:     { flex: 1, backgroundColor: T.bg },
  scroll:   { flexGrow: 1, paddingHorizontal: S.screen, paddingVertical: S.s8, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: S.s8 },
  card: {
    backgroundColor: T.surface, borderRadius: R.xl,
    padding: S.s6, borderWidth: 1, borderColor: T.hairline,
  },
  cardTitle: { fontFamily: F.bold, fontSize: 24, fontWeight: '700', color: T.text, letterSpacing: -0.48, marginBottom: 4 },
  cardSub:   { fontFamily: F.regular, fontSize: 14.5, color: T.textMuted, marginBottom: S.s6 },
  divider:      { flexDirection: 'row', alignItems: 'center', marginVertical: S.s5 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: T.line },
  dividerText:  { fontFamily: F.regular, fontSize: 13, color: T.textFaint, marginHorizontal: S.s3 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.surface2, borderWidth: 1, borderColor: T.hairline,
    borderRadius: R.sm, paddingVertical: S.s4,
  },
  googleG:    { fontSize: 15, fontWeight: '800', color: '#4285F4', marginRight: S.s2 },
  googleText: { fontFamily: F.semiBold, fontSize: 14.5, fontWeight: '600', color: T.text },
  footerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: S.s6 },
  footerText: { fontFamily: F.regular, fontSize: 14, color: T.textMuted },
  footerLink: { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.accent },
  devBtn: {
    marginTop: S.s6, alignSelf: 'center',
    paddingVertical: S.s2, paddingHorizontal: S.s4,
    borderRadius: R.xs, borderWidth: 1, borderColor: T.errorBg,
    backgroundColor: T.errorBg,
  },
  devText: { fontFamily: F.medium, fontSize: 12, color: T.error },
});

const LoginScreen: React.FC = () => {
  const { t }        = useTranslation();
  const navigation   = useNavigation<LoginNav>();
  const { signIn, signInWithGoogle, skipLogin } = useAuth();
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (v: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
      setEmailError(t('auth.login.errors.invalidEmail')); return false;
    }
    setEmailError(''); return true;
  };

  const validatePassword = (v: string) => {
    if (!v.trim()) { setPasswordError(t('auth.login.errors.wrongPassword')); return false; }
    setPasswordError(''); return true;
  };

  const handleSignIn = async () => {
    if (!validateEmail(email) || !validatePassword(password)) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('wrong-password') || code.includes('invalid-credential'))
        setPasswordError(t('auth.login.errors.wrongPassword'));
      else if (code.includes('user-not-found'))
        setEmailError(t('auth.login.errors.userNotFound'));
      else if (code.includes('invalid-email'))
        setEmailError(t('auth.login.errors.invalidEmail'));
      else if (code.includes('too-many-requests'))
        Alert.alert(t('common.error'), t('auth.login.errors.tooManyRequests'));
      else
        Alert.alert(t('common.error'), t('auth.login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <PrezenceLogo size="lg" showTagline />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('auth.login.title')}</Text>
            <Text style={styles.cardSub}>{t('auth.login.subtitle')}</Text>

            <Input
              label={t('auth.login.emailLabel')}
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label={t('auth.login.passwordLabel')}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
              error={passwordError}
              isPassword
            />

            <Button
              label={t('auth.login.signInButton')}
              onPress={handleSignIn}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: S.s2 }}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.orText')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && { opacity: 0.6 }]}
              onPress={async () => {
                setGoogleLoading(true);
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  const code = err?.code || '';
                  if (!code.includes('SIGN_IN_CANCELLED')) {
                    Alert.alert(t('common.error'), t('auth.login.errors.generic'));
                  }
                } finally {
                  setGoogleLoading(false);
                }
              }}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>{t('auth.login.googleButton')}</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t('auth.login.noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>{t('auth.login.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DEV bypass */}
          <TouchableOpacity style={styles.devBtn} onPress={skipLogin} activeOpacity={0.7}>
            <Text style={styles.devText}>⚡ Skip Login (Dev)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
