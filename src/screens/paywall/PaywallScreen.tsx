import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { getOfferings, purchasePackage, restorePurchases } from '../../services/revenuecat';
import Button from '../../components/Button';
import PrezenceLogo from '../../components/PrezenceLogo';

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

const PaywallScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<any>(null);

  useEffect(() => {
    const loadOffering = async () => {
      try {
        const data = await getOfferings();
        setOffering(data);
      } catch {
        // use default price
      }
    };
    loadOffering();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // The offering may not have loaded yet (or the first fetch failed) — try
      // once more at tap time before giving up.
      let current = offering;
      if (!current) {
        current = await getOfferings();
        setOffering(current);
      }

      const pkg = current?.monthly || current?.availablePackages?.[0];

      if (!pkg) {
        // No offering available — RevenueCat keys or store products not set up.
        Alert.alert(t('paywall.title'), t('paywall.errors.notAvailable'), [
          { text: t('common.ok') },
        ]);
        setLoading(false);
        return;
      }

      // Triggers the native App Store / Play Store purchase dialog.
      const success = await purchasePackage(pkg);
      if (success) {
        Alert.alert(t('common.ok'), t('paywall.purchaseSuccess'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      if (!error?.message?.includes('cancelled') && error?.userCancelled !== true) {
        Alert.alert(t('common.error'), t('paywall.errors.purchaseFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(t('common.ok'), 'Purchases restored successfully!', [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(t('common.error'), t('paywall.errors.restoreFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('paywall.errors.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  const features: { key: keyof typeof featureIcons; icon: string; color: string }[] = [
    { key: 'unlimited', icon: 'infinite', color: COLORS.primary },
    { key: 'detailed', icon: 'sparkles', color: COLORS.primaryLight },
    { key: 'progress', icon: 'trending-up', color: COLORS.success },
    { key: 'exercises', icon: 'barbell', color: '#FFD93D' },
    { key: 'compare', icon: 'git-compare', color: COLORS.accent },
  ];

  const featureIcons = {
    unlimited: true,
    detailed: true,
    progress: true,
    exercises: true,
    compare: true,
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <PrezenceLogo size="md" showTagline={false} style={styles.payLogo} />
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={14} color={COLORS.primary} />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          {features.map((feature) => (
            <View key={feature.key} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                <Ionicons name={feature.icon as any} size={18} color={feature.color} />
              </View>
              <Text style={styles.featureText}>
                {t(`paywall.features.${feature.key}`)}
              </Text>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            </View>
          ))}
        </View>

        {/* Pricing card */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingBadge}>MOST POPULAR</Text>
          </View>
          <Text style={styles.priceText}>{t('paywall.price')}</Text>
          <Text style={styles.priceSubtext}>per month, billed monthly</Text>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Button
            label={t('paywall.trialButton')}
            onPress={handleSubscribe}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.ctaButton}
          />

          <Text style={styles.disclaimerText}>{t('paywall.disclaimer')}</Text>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            <Text style={styles.restoreText}>
              {restoring ? t('common.loading') : t('paywall.restore')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>{t('paywall.termsNotice')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  payLogo: {
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,127,232,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(59,127,232,0.3)',
    gap: 5,
    marginBottom: 16,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
  },
  featuresCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: 'DMSans_400Regular',
  },
  pricingCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    overflow: 'hidden',
  },
  pricingHeader: {
    marginBottom: 8,
  },
  pricingBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  priceText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  priceSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  ctaSection: {
    alignItems: 'center',
  },
  ctaButton: {
    borderRadius: 16,
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  restoreButton: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  restoreText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});

export default PaywallScreen;
