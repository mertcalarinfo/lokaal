import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { changeLanguage } from '../../i18n';

const COLORS = {
  background: '#0a1628',
  surface: '#0d1b2e',
  surfaceElevated: '#111d30',
  primary: '#3B7FE8',
  primaryLight: '#5B9AFF',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(59,127,232,0.3)',
};

const APP_VERSION = '1.0.0';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, signOut, updateLanguage } = useAuth();
  const { subscription, isSubscribed } = useSubscription(user?.uid || null);

  const [signingOut, setSigningOut] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);

  const currentLanguage = user?.language || 'en';

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Explicit language selection (replaces the old toggle). Picking the already
  // active language is a no-op. i18n updates first so all t() calls switch in
  // the same render as the optimistic updateLanguage() state change.
  const handleSelectLanguage = async (lang: 'en' | 'de') => {
    if (lang === currentLanguage || languageLoading) return;
    setLanguageLoading(true);
    try {
      await changeLanguage(lang);
      await updateLanguage(lang);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setLanguageLoading(false);
    }
  };

  const handleEditGoals = () => {
    navigation.navigate('EditGoals', { mode: 'edit' });
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOut'),
      t('settings.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
            } catch (error) {
              Alert.alert(t('common.error'), t('common.error'));
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    if (!isSubscribed) {
      navigation.navigate('Paywall');
    } else {
      const url =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(url).catch(() => {
        Alert.alert(t('common.error'), t('common.error'));
      });
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const renderRow = (
    icon: string,
    iconColor: string,
    label: string,
    right?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {right}
        {onPress && !right && (
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  // A selectable language row with a checkmark on the active language.
  const renderLanguageOption = (code: 'en' | 'de', label: string) => {
    const active = currentLanguage === code;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleSelectLanguage(code)}
        disabled={languageLoading}
        activeOpacity={0.7}
      >
        <View style={[styles.rowIcon, { backgroundColor: `${COLORS.primary}20` }]}>
          <Ionicons name="language-outline" size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowRight}>
          {active && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>

        {/* Profile section */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.displayName ? getInitials(user.displayName) : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName || '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
          </View>
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: isSubscribed ? 'rgba(78,205,196,0.15)' : 'rgba(59,127,232,0.15)' },
            ]}
          >
            <Ionicons
              name={isSubscribed ? 'star' : 'star-outline'}
              size={12}
              color={isSubscribed ? COLORS.success : COLORS.primary}
            />
            <Text
              style={[
                styles.tierBadgeText,
                { color: isSubscribed ? COLORS.success : COLORS.primary },
              ]}
            >
              {isSubscribed ? t('settings.tierPremium') : t('settings.tierFree')}
            </Text>
          </View>
        </View>

        {/* Language — explicit selector (English / Deutsch) */}
        {renderSection(
          t('settings.language'),
          <>
            {renderLanguageOption('en', t('settings.languageEn'))}
            <View style={styles.rowDivider} />
            {renderLanguageOption('de', t('settings.languageDe'))}
          </>
        )}

        {/* Coaching goals — no goal text shown, just the edit entry point */}
        {renderSection(
          t('settings.coachingGoals'),
          renderRow(
            'create-outline',
            COLORS.primary,
            t('settings.editGoals'),
            undefined,
            handleEditGoals
          )
        )}

        {/* Subscription */}
        {renderSection(
          t('settings.subscription'),
          <>
            {renderRow(
              isSubscribed ? 'star' : 'star-outline',
              isSubscribed ? COLORS.success : COLORS.textMuted,
              isSubscribed ? t('settings.subscriptionPremium') : t('settings.subscriptionFree'),
              <Text style={[styles.rowValue, { color: isSubscribed ? COLORS.success : COLORS.textMuted }]}>
                {isSubscribed ? t('settings.statusActive') : t('settings.statusFree')}
              </Text>
            )}
            <View style={styles.rowDivider} />
            {renderRow(
              'card-outline',
              COLORS.primary,
              t('settings.manageSubscription'),
              undefined,
              handleManageSubscription
            )}
          </>
        )}

        {/* Account */}
        {renderSection(
          t('settings.appVersion'),
          <>
            {renderRow(
              'information-circle-outline',
              COLORS.textMuted,
              t('settings.version', { version: APP_VERSION }),
              undefined
            )}
          </>
        )}

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.accent} />
          <Text style={styles.signOutText}>
            {signingOut ? t('common.loading') : t('settings.signOut')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 18,
    fontFamily: 'DMSans_700Bold',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#3B7FE8',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: 'DMSans_400Regular',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 62,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
    gap: 10,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
});

export default SettingsScreen;
