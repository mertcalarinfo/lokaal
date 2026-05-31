import React, { useState, ReactNode } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Globe, Pencil, Star, CreditCard, Info, LogOut,
  ChevronRight, CheckCircle2,
} from 'lucide-react-native';

import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { changeLanguage } from '../../i18n';
import { C, F, R, S } from '../../theme';

const APP_VERSION = '1.0.0';

const SettingsScreen: React.FC = () => {
  const { t }        = useTranslation();
  const navigation   = useNavigation<any>();
  const { user, signOut, updateLanguage } = useAuth();
  const { subscription, isSubscribed }   = useSubscription(user?.uid || null);

  const [signingOut,      setSigningOut]      = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);

  const currentLang = user?.language || 'en';

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSelectLanguage = async (lang: 'en' | 'de') => {
    if (lang === currentLang || languageLoading) return;
    setLanguageLoading(true);
    try {
      await changeLanguage(lang);
      await updateLanguage(lang);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setLanguageLoading(false);
    }
  };

  const handleEditGoals = () => navigation.navigate('EditGoals', { mode: 'edit' });

  const handleSignOut = () => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try { await signOut(); }
          catch { Alert.alert(t('common.error'), t('common.error')); }
          finally { setSigningOut(false); }
        },
      },
    ]);
  };

  const handleManageSubscription = () => {
    if (!isSubscribed) {
      navigation.navigate('Paywall');
    } else {
      const url = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(url).catch(() => Alert.alert(t('common.error'), t('common.error')));
    }
  };

  // ── Layout helpers ─────────────────────────────────────────────────────────

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({
    icon, label, right, onPress,
  }: { icon: ReactNode; label: string; right?: ReactNode; onPress?: () => void }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {right}
        {onPress && !right && <ChevronRight size={16} color={C.textFaint} strokeWidth={1.7} />}
      </View>
    </TouchableOpacity>
  );

  const LangRow = ({ code, label }: { code: 'en' | 'de'; label: string }) => {
    const active = currentLang === code;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleSelectLanguage(code)}
        disabled={languageLoading}
        activeOpacity={0.7}
      >
        <View style={styles.rowIcon}><Globe size={18} color={C.textMuted} strokeWidth={1.7} /></View>
        <Text style={[styles.rowLabel, active && { color: C.accent }]}>{label}</Text>
        <View style={styles.rowRight}>
          {active && <CheckCircle2 size={18} color={C.accent} strokeWidth={1.7} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName ? getInitials(user.displayName) : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName || '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
          </View>
          <View style={[
            styles.tierPill,
            { backgroundColor: isSubscribed ? C.successBg : C.surfaceAccent },
          ]}>
            <Text style={[styles.tierPillText, { color: isSubscribed ? C.success : C.textMuted }]}>
              {isSubscribed ? t('settings.tierPremium') : t('settings.tierFree')}
            </Text>
          </View>
        </View>

        {/* Language */}
        <Section title={t('settings.language')}>
          <LangRow code="en" label={t('settings.languageEn')} />
          <View style={styles.divider} />
          <LangRow code="de" label={t('settings.languageDe')} />
        </Section>

        {/* Coaching goals */}
        <Section title={t('settings.coachingGoals')}>
          <Row
            icon={<Pencil size={18} color={C.textMuted} strokeWidth={1.7} />}
            label={t('settings.editGoals')}
            onPress={handleEditGoals}
          />
        </Section>

        {/* Subscription */}
        <Section title={t('settings.subscription')}>
          <Row
            icon={<Star size={18} color={isSubscribed ? C.success : C.textFaint} strokeWidth={1.7} />}
            label={isSubscribed ? t('settings.subscriptionPremium') : t('settings.subscriptionFree')}
            right={
              <Text style={[styles.rowValue, { color: isSubscribed ? C.success : C.textFaint }]}>
                {isSubscribed ? t('settings.statusActive') : t('settings.statusFree')}
              </Text>
            }
          />
          <View style={styles.divider} />
          <Row
            icon={<CreditCard size={18} color={C.textMuted} strokeWidth={1.7} />}
            label={t('settings.manageSubscription')}
            onPress={handleManageSubscription}
          />
        </Section>

        {/* App version */}
        <Section title={t('settings.appVersion')}>
          <Row
            icon={<Info size={18} color={C.textFaint} strokeWidth={1.7} />}
            label={t('settings.version', { version: APP_VERSION })}
          />
        </Section>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOut}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={C.error} strokeWidth={1.7} />
          <Text style={styles.signOutText}>
            {signingOut ? t('common.loading') : t('settings.signOut')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { paddingHorizontal: S.screen, paddingTop: S.s4, paddingBottom: S.s6 },
  pageTitle: {
    fontFamily: F.xBold, fontSize: 34, fontWeight: '800',
    color: C.text, letterSpacing: -1.02, marginBottom: S.s5,
  },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.lg,
    padding: S.s4, marginBottom: S.s5,
    borderWidth: 1, borderColor: C.hairline, gap: S.s3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: R.sm,
    backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.hairline,
  },
  avatarText:   { fontFamily: F.bold, fontSize: 17, fontWeight: '700', color: C.text },
  profileInfo:  { flex: 1 },
  profileName:  { fontFamily: F.semiBold, fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  profileEmail: { fontFamily: F.regular,  fontSize: 12, color: C.textFaint },
  tierPill: {
    borderRadius: R.pill, paddingHorizontal: S.s3, paddingVertical: 5,
    borderWidth: 1, borderColor: C.hairline,
  },
  tierPillText: { fontFamily: F.semiBold, fontSize: 11, fontWeight: '700' },
  section: { marginBottom: S.s5 },
  sectionLabel: {
    fontFamily: F.semiBold, fontSize: 10, fontWeight: '600',
    color: C.textFaint, letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: S.s2, marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.hairline, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.s4, paddingVertical: S.s4, gap: S.s3,
  },
  rowIcon:  { width: 20, alignItems: 'center' },
  rowLabel: { flex: 1, fontFamily: F.medium, fontSize: 15, fontWeight: '500', color: C.text },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { fontFamily: F.medium, fontSize: 13, fontWeight: '500', marginRight: 4 },
  divider:  { height: 1, backgroundColor: C.line, marginLeft: S.s4 + 20 + S.s3 },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.errorBg, borderRadius: R.md,
    paddingVertical: S.s4, marginTop: S.s2,
    borderWidth: 1, borderColor: C.error,
    gap: S.s3,
  },
  signOutText: { fontFamily: F.semiBold, fontSize: 15, fontWeight: '600', color: C.error },
});

export default SettingsScreen;
