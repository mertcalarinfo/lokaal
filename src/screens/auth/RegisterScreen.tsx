import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';

import { AuthStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/Input';
import Button from '../../components/Button';
import PrezenceLogo from '../../components/PrezenceLogo';
import { C, F, R, S } from '../../theme';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const { t }        = useTranslation();
  const navigation   = useNavigation<RegisterNav>();
  const { signUp }   = useAuth();

  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError,    setNameError]    = useState('');
  const [emailError,   setEmailError]   = useState('');
  const [passError,    setPassError]    = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading,      setLoading]      = useState(false);

  const validate = () => {
    let ok = true;
    if (!name.trim())                               { setNameError(t('auth.register.errors.nameRequired'));     ok = false; } else setNameError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError(t('auth.register.errors.invalidEmail')); ok = false; } else setEmailError('');
    if (password.length < 8)                        { setPassError(t('auth.register.errors.passwordTooShort')); ok = false; } else setPassError('');
    if (password !== confirmPassword)               { setConfirmError(t('auth.register.errors.passwordsNoMatch')); ok = false; } else setConfirmError('');
    return ok;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      navigation.navigate('LanguageSelect');
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('email-already-in-use'))  setEmailError(t('auth.register.errors.emailInUse'));
      else if (code.includes('invalid-email'))    setEmailError(t('auth.register.errors.invalidEmail'));
      else if (code.includes('weak-password'))    setPassError(t('auth.register.errors.passwordTooShort'));
      else Alert.alert(t('common.error'), t('auth.register.errors.generic'));
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color={C.text} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <PrezenceLogo size="md" layout="horizontal" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('auth.register.title')}</Text>
            <Text style={styles.cardSub}>{t('auth.register.subtitle')}</Text>

            <Input label={t('auth.register.nameLabel')}            placeholder={t('auth.register.namePlaceholder')}
              value={name}            onChangeText={(v) => { setName(v);            if (nameError)    setNameError(''); }}
              error={nameError}       autoCapitalize="words" autoCorrect={false} />
            <Input label={t('auth.register.emailLabel')}           placeholder={t('auth.register.emailPlaceholder')}
              value={email}           onChangeText={(v) => { setEmail(v);           if (emailError)   setEmailError(''); }}
              error={emailError}      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Input label={t('auth.register.passwordLabel')}        placeholder={t('auth.register.passwordPlaceholder')}
              value={password}        onChangeText={(v) => { setPassword(v);        if (passError)    setPassError(''); }}
              error={passError}       isPassword />
            <Input label={t('auth.register.confirmPasswordLabel')} placeholder={t('auth.register.confirmPasswordPlaceholder')}
              value={confirmPassword} onChangeText={(v) => { setConfirmPassword(v); if (confirmError) setConfirmError(''); }}
              error={confirmError}    isPassword />

            <Button
              label={t('auth.register.signUpButton')}
              onPress={handleSignUp}
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

            <TouchableOpacity style={styles.googleBtn} onPress={() => {}} activeOpacity={0.8}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>{t('auth.register.googleButton')}</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t('auth.register.hasAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>{t('auth.register.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flexGrow: 1, paddingHorizontal: S.screen, paddingVertical: S.s6 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: S.s4 },
  logoWrap: { marginBottom: S.s6 },
  card: {
    backgroundColor: C.surface, borderRadius: R.xl,
    padding: S.s6, borderWidth: 1, borderColor: C.hairline,
  },
  cardTitle: { fontFamily: F.bold, fontSize: 24, fontWeight: '700', color: C.text, letterSpacing: -0.48, marginBottom: 4 },
  cardSub:   { fontFamily: F.regular, fontSize: 14.5, color: C.textMuted, marginBottom: S.s6 },
  divider:   { flexDirection: 'row', alignItems: 'center', marginVertical: S.s5 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  dividerText: { fontFamily: F.regular, fontSize: 13, color: C.textFaint, marginHorizontal: S.s3 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.hairline,
    borderRadius: R.sm, paddingVertical: S.s4,
  },
  googleG:    { fontSize: 15, fontWeight: '800', color: '#4285F4', marginRight: S.s2 },
  googleText: { fontFamily: F.semiBold, fontSize: 14.5, fontWeight: '600', color: C.text },
  footerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: S.s6 },
  footerText: { fontFamily: F.regular, fontSize: 14, color: C.textMuted },
  footerLink: { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: C.accent },
});

export default RegisterScreen;
