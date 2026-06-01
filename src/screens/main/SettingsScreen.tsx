import React, { useState, ReactNode, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Globe, Pencil, Star, CreditCard, Info, LogOut,
  ChevronRight, CheckCircle2, Sun, Moon, Smartphone,
} from 'lucide-react-native';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemePreference } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';
import { changeLanguage } from '../../i18n';
import { ThemeColors, F, R, S } from '../../theme';

const APP_VERSION = '1.0.0';

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: T.bg },
  scroll:  { paddingHorizontal: S.screen, paddingTop: S.s4, paddingBottom: S.s6 },
  pageTitle: {
    fontFamily: F.xBold, fontSize: 34, fontWeight: '800',
    color: T.text, letterSpacing: -1.02, marginBottom: S.s5,
  },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: R.lg,
    padding: S.s4, marginBottom: S.s5,
    borderWidth: 1, borderColor: T.hairline, gap: S.s3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: R.sm,
    backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.hairline,
  },
  avatarText:   { fontFamily: F.bold, fontSize: 17, fontWeight: '700', color: T.text },
  profileInfo:  { flex: 1 },
  profileName:  { fontFamily: F.semiBold, fontSize: 15, fontWeight: '600', color: T.text, marginBottom: 2 },
  profileEmail: { fontFamily: F.regular,  fontSize: 12, color: T.textFaint },
  tierPill: {
    borderRadius: R.pill, paddingHorizontal: S.s3, paddingVertical: 5,
    borderWidth: 1, borderColor: T.hairline,
  },
  tierPillText: { fontFamily: F.semiBold, fontSize: 11, fontWeight: '700' },
  section:      { marginBottom: S.s5 },
  sectionLabel: {
    fontFamily: F.semiBold, fontSize: 10, fontWeight: '600',
    color: T.textFaint, letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: S.s2, marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: T.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: T.hairline, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.s4, paddingVertical: S.s4, gap: S.s3,
  },
  rowIcon:  { width: 20, alignItems: 'center' },
  rowLabel: { flex: 1, fontFamily: F.medium, fontSize: 15, fontWeight: '500', color: T.text },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { fontFamily: F.medium, fontSize: 13, fontWeight: '500', marginRight: 4 },
  divider:  { height: 1, backgroundColor: T.line, marginLeft: S.s4 + 20 + S.s3 },
  // §04 Settings-Radio — gefüllter Sand-Kreis mit dunklem Check (aktiv)
  radioFilled: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  radioEmpty: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: T.hairline,
  },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.errorBg, borderRadius: R.md,
    paddingVertical: S.s4, marginTop: S.s2,
    borderWidth: 1, borderColor: T.error,
    gap: S.s3,
  },
  signOutText: { fontFamily: F.semiBold, fontSize: 15, fontWeight: '600', color: T.error },
});

const SettingsScreen: React.FC = () => {
  const { t }        = useTranslation();
  const navigation   = useNavigation<any>();
  const { user, signOut, updateLanguage } = useAuth();
  const { subscription, isSubscribed }   = useSubscription(user?.uid || null);
  const { T, themePreference, setThemePreference } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

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
        {onPress && !right && <ChevronRight size={16} color={T.textFaint} strokeWidth={1.7} />}
      </View>
    </TouchableOpacity>
  );

  // Settings-Radio — gefüllter Sand-Kreis mit dunklem Check (aktiv)
  //                  leerer Outline-Kreis (inaktiv)  (§04 Settings-Radio)
  const RadioRow = ({
    active, label, icon, onPress,
  }: { active: boolean; label: string; icon: ReactNode; onPress: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={[styles.rowLabel, active && { color: T.accent }]}>{label}</Text>
      <View style={styles.rowRight}>
        {active ? (
          <View style={styles.radioFilled}>
            <CheckCircle2 size={11} color={T.onAccent} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={styles.radioEmpty} />
        )}
      </View>
    </TouchableOpacity>
  );

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
            { backgroundColor: isSubscribed ? T.successBg : T.surfaceAccent },
          ]}>
            <Text style={[styles.tierPillText, { color: isSubscribed ? T.success : T.textMuted }]}>
              {isSubscribed ? t('settings.tierPremium') : t('settings.tierFree')}
            </Text>
          </View>
        </View>

        {/* Darstellung (Theme) */}
        <Section title={t('settings.appearance')}>
          <RadioRow
            active={themePreference === 'system'}
            label={t('settings.themeSystem')}
            icon={<Smartphone size={18} color={T.textMuted} strokeWidth={1.7} />}
            onPress={() => setThemePreference('system')}
          />
          <View style={styles.divider} />
          <RadioRow
            active={themePreference === 'dark'}
            label={t('settings.themeDark')}
            icon={<Moon size={18} color={T.textMuted} strokeWidth={1.7} />}
            onPress={() => setThemePreference('dark')}
          />
          <View style={styles.divider} />
          <RadioRow
            active={themePreference === 'light'}
            label={t('settings.themeLight')}
            icon={<Sun size={18} color={T.textMuted} strokeWidth={1.7} />}
            onPress={() => setThemePreference('light')}
          />
        </Section>

        {/* Language */}
        <Section title={t('settings.language')}>
          <RadioRow
            active={currentLang === 'en'}
            label={t('settings.languageEn')}
            icon={<Globe size={18} color={T.textMuted} strokeWidth={1.7} />}
            onPress={() => handleSelectLanguage('en')}
          />
          <View style={styles.divider} />
          <RadioRow
            active={currentLang === 'de'}
            label={t('settings.languageDe')}
            icon={<Globe size={18} color={T.textMuted} strokeWidth={1.7} />}
            onPress={() => handleSelectLanguage('de')}
          />
        </Section>

        {/* Coaching goals */}
        <Section title={t('settings.coachingGoals')}>
          <Row
            icon={<Pencil size={18} color={T.textMuted} strokeWidth={1.7} />}
            label={t('settings.editGoals')}
            onPress={handleEditGoals}
          />
        </Section>

        {/* Subscription */}
        <Section title={t('settings.subscription')}>
          <Row
            icon={<Star size={18} color={isSubscribed ? T.success : T.textFaint} strokeWidth={1.7} />}
            label={isSubscribed ? t('settings.subscriptionPremium') : t('settings.subscriptionFree')}
            right={
              <Text style={[styles.rowValue, { color: isSubscribed ? T.success : T.textFaint }]}>
                {isSubscribed ? t('settings.statusActive') : t('settings.statusFree')}
              </Text>
            }
          />
          <View style={styles.divider} />
          <Row
            icon={<CreditCard size={18} color={T.textMuted} strokeWidth={1.7} />}
            label={t('settings.manageSubscription')}
            onPress={handleManageSubscription}
          />
        </Section>

        {/* App version */}
        <Section title={t('settings.appVersion')}>
          <Row
            icon={<Info size={18} color={T.textFaint} strokeWidth={1.7} />}
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
          <LogOut size={18} color={T.error} strokeWidth={1.7} />
          <Text style={styles.signOutText}>
            {signingOut ? t('common.loading') : t('settings.signOut')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
