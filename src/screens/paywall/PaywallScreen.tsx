import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  X, Star, CheckCircle2, Infinity,
  Sparkles, TrendingUp, Dumbbell, GitCompare,
} from 'lucide-react-native';

import { getOfferings, purchasePackage, restorePurchases } from '../../services/revenuecat';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/Button';
import PrezenceLogo from '../../components/PrezenceLogo';
import { ThemeColors, F, R, S } from '../../theme';

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:  { flex: 1, backgroundColor: T.bg },
  closeBtn: {
    position: 'absolute', top: 56, right: S.screen, zIndex: 10,
    width: 34, height: 34, borderRadius: R.pill,
    backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.hairline,
  },
  scroll: { paddingHorizontal: S.screen, paddingTop: 60, paddingBottom: S.s10 },
  header: { alignItems: 'center', marginBottom: S.s8 },
  premiumPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surfaceAccent, borderRadius: R.pill,
    paddingHorizontal: S.s3, paddingVertical: 5,
    borderWidth: 1, borderColor: T.hairline, gap: 5, marginBottom: S.s4,
  },
  premiumPillText: { fontFamily: F.xBold, fontSize: 11, fontWeight: '800', color: T.accent, letterSpacing: 2 },
  title: {
    fontFamily: F.xBold, fontSize: 28, fontWeight: '800',
    color: T.text, marginBottom: S.s2, textAlign: 'center', letterSpacing: -0.56,
  },
  subtitle: {
    fontFamily: F.regular, fontSize: 14.5, color: T.textMuted,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: S.s4,
  },
  featuresCard: {
    backgroundColor: T.surface, borderRadius: R.lg,
    padding: S.s5, marginBottom: S.s5,
    borderWidth: 1, borderColor: T.hairline,
  },
  featureRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: S.s3 },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: R.sm,
    alignItems: 'center', justifyContent: 'center', marginRight: S.s3,
  },
  featureText: { flex: 1, fontFamily: F.medium, fontSize: 14.5, fontWeight: '500', color: T.text },
  pricingCard: {
    borderRadius: R.lg, padding: S.s5, marginBottom: S.s6,
    borderWidth: 1.5, borderColor: T.accent, alignItems: 'center',
  },
  pricingTag: {
    fontFamily: F.xBold, fontSize: 10, fontWeight: '800',
    color: T.accent, letterSpacing: 2.5, marginBottom: S.s2,
  },
  priceNum: {
    fontFamily: F.xBold, fontSize: 38, fontWeight: '800',
    color: T.text, letterSpacing: -1, marginBottom: 3,
  },
  priceSub:    { fontFamily: F.regular, fontSize: 13, color: T.textFaint },
  cta:         { alignItems: 'center' },
  disclaimer:  { fontFamily: F.regular, fontSize: 13, color: T.textFaint, textAlign: 'center', marginBottom: S.s4 },
  restoreBtn:  { paddingVertical: S.s2, marginBottom: S.s3 },
  restoreText: { fontFamily: F.medium, fontSize: 14, color: T.textMuted, textDecorationLine: 'underline' },
  terms:       { fontFamily: F.regular, fontSize: 11, color: T.textFaint, textAlign: 'center', lineHeight: 16, paddingHorizontal: S.s4 },
});

const PaywallScreen: React.FC = () => {
  const { t }      = useTranslation();
  const navigation = useNavigation();
  const { T }      = useTheme();
  const styles     = useMemo(() => createStyles(T), [T]);

  const [loading,   setLoading]   = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering,  setOffering]  = useState<any>(null);

  useEffect(() => {
    getOfferings().then(setOffering).catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      let current = offering;
      if (!current) { current = await getOfferings(); setOffering(current); }
      const pkg = current?.monthly || current?.availablePackages?.[0];
      if (!pkg) {
        Alert.alert(t('paywall.title'), t('paywall.errors.notAvailable'), [{ text: t('common.ok') }]);
        return;
      }
      const ok = await purchasePackage(pkg);
      if (ok) Alert.alert(t('common.ok'), t('paywall.purchaseSuccess'), [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      if (!err?.message?.includes('cancelled') && err?.userCancelled !== true)
        Alert.alert(t('common.error'), t('paywall.errors.purchaseFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const ok = await restorePurchases();
      if (ok) Alert.alert(t('common.ok'), 'Purchases restored!', [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
      else    Alert.alert(t('common.error'), t('paywall.errors.restoreFailed'));
    } catch {
      Alert.alert(t('common.error'), t('paywall.errors.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  const features = [
    { key: 'unlimited', Icon: Infinity,   color: T.accent   },
    { key: 'detailed',  Icon: Sparkles,   color: T.textMuted },
    { key: 'progress',  Icon: TrendingUp, color: T.success  },
    { key: 'exercises', Icon: Dumbbell,   color: T.textMuted },
    { key: 'compare',   Icon: GitCompare, color: T.textMuted },
  ] as const;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <X size={20} color={T.textMuted} strokeWidth={1.7} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <PrezenceLogo size="md" showTagline={false} style={{ marginBottom: S.s4 }} />
          <View style={styles.premiumPill}>
            <Star size={13} color={T.accent} strokeWidth={1.7} />
            <Text style={styles.premiumPillText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          {features.map(({ key, Icon, color }) => (
            <View key={key} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${color}18` }]}>
                <Icon size={17} color={color} strokeWidth={1.7} />
              </View>
              <Text style={styles.featureText}>{t(`paywall.features.${key}`)}</Text>
              <CheckCircle2 size={17} color={T.success} strokeWidth={1.7} />
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTag}>MOST POPULAR</Text>
          <Text style={styles.priceNum}>{t('paywall.price')}</Text>
          <Text style={styles.priceSub}>per month, billed monthly</Text>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            label={t('paywall.trialButton')}
            onPress={handleSubscribe}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginBottom: S.s4 }}
          />
          <Text style={styles.disclaimer}>{t('paywall.disclaimer')}</Text>
          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
            <Text style={styles.restoreText}>
              {restoring ? t('common.loading') : t('paywall.restore')}
            </Text>
          </TouchableOpacity>
          <Text style={styles.terms}>{t('paywall.termsNotice')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaywallScreen;
