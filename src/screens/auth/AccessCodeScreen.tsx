import React, { useState, useCallback } from 'react';
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
import PressableScale from '../../components/PressableScale';
import { RC, MONO, MONO_MED, RS, BTN_SHADOW, HL, RR } from '../../theme/register';

type AccessNav = NativeStackNavigationProp<AuthStackParamList, 'AccessCode'>;

const AccessCodeScreen: React.FC = () => {
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
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── AKTENKOPF ── */}
        <View style={S.head}>
          <PressableScale onPress={() => navigation.goBack()} style={S.backBtn}>
            <ArrowLeft size={16} color={RC.text} strokeWidth={1.8} />
          </PressableScale>
          <Text style={S.headTitle}>{t('access.title').toUpperCase()}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={S.body}>
          <Text style={S.hint}>{t('access.hint')}</Text>

          <TextInput
            style={S.input}
            value={code}
            onChangeText={(v) => { setCode(v); if (error) setError(null); }}
            placeholder={t('access.placeholder')}
            placeholderTextColor={RC.ghost}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            editable={!busy}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
          />

          {error && <Text style={S.error}>{error}</Text>}
          {info  && <Text style={S.info}>{info}</Text>}

          <View style={{ height: 22 }} />

          <PressableScale onPress={onSubmit} disabled={busy || !code.trim()} style={{ alignSelf: 'stretch' }}>
            <View style={[S.btn, BTN_SHADOW, (busy || !code.trim()) && S.btnDisabled]}>
              <Text style={S.btnLabel}>{t('access.redeem')}</Text>
              <ArrowRight size={18} color={RC.onAccent} strokeWidth={1.8} />
            </View>
          </PressableScale>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AccessCodeScreen;

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RC.bg },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: RS.headTop,
    paddingHorizontal: RS.screenH,
    paddingBottom: RS.headPadB,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  backBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  headTitle: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 2,
    color: RC.text,
  },

  body: {
    paddingHorizontal: RS.screenH,
    paddingTop: 34,
  },
  hint: {
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 21,
    color: RC.muted,
    marginBottom: 22,
  },
  input: {
    fontSize: 18,
    letterSpacing: 2,
    color: RC.text,
    borderWidth: 1.5,
    borderColor: RC.line,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  error: {
    fontFamily: MONO,
    fontSize: 13,
    color: RC.faint,
    marginTop: 12,
  },
  info: {
    fontFamily: MONO_MED,
    fontSize: 13,
    color: RC.accent,
    marginTop: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 18,
  },
  btnDisabled: { opacity: 0.4 },
  btnLabel: {
    fontFamily: MONO_MED,
    fontSize: 15,
    letterSpacing: 1,
    color: RC.onAccent,
  },
});
