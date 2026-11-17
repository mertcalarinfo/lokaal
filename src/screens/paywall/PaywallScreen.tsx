import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Pressable, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { getOfferings, purchasePackage, restorePurchases } from '../../services/revenuecat';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription, PRO_MONTHLY_LIMIT } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import AmbientBackground from '../../components/AmbientBackground';
import Button from '../../components/Button';
import Card from '../../components/Card';
import GlassIconButton from '../../components/GlassIconButton';
import PrezenceLogo from '../../components/PrezenceLogo';
import { CheckIcon } from '../../components/Icons';
import { ThemeColors, F, R, S as SP } from '../../theme';

// Rechtstexte — die Seiten, die das Projekt bereits für Support & Legal nutzt.
// Für Nutzungsbedingungen gibt es dort (noch) keine eigene Seite; bis dahin gilt
// Apples Standard-EULA, die auch in App Store Connect hinterlegt ist.
const PRIVACY_URL = 'https://mertcalarinfo.github.io/prezence-legal/privacy-policy.html';
const TERMS_URL   = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const FEATURE_KEYS = ['monthly', 'detailed', 'progress', 'compare', 'exercises'] as const;

const PaywallScreen: React.FC = () => {
  const { t }             = useTranslation();
  const navigation        = useNavigation();
  const { T }             = useTheme();
  const { user, showProNotice } = useAuth();
  const { proState }      = useSubscription(user?.uid || null);
  const styles            = useMemo(() => createStyles(T), [T]);

  const [loading,   setLoading]   = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering,  setOffering]  = useState<any>(null);

  // 'active' ist ein unreachable/Race-Only-Edge-Case: beide Navigations-Stellen
  // (SettingsScreen, HomeScreen) schließen aktive Pro-Nutzer bereits vom Paywall
  // aus. Fällt bewusst auf die Standard-Copy zurück.
  const titleKey    = proState === 'expired' ? 'paywall.expiredTitle'    : 'paywall.title';
  const subtitleKey = proState === 'expired' ? 'paywall.expiredSubtitle' : 'paywall.subtitle';

  useEffect(() => {
    getOfferings().then(setOffering).catch(() => {});
  }, []);

  // Preis aus dem Store-Produkt, nie fest im Text
  const pkg   = offering?.monthly || offering?.availablePackages?.[0];
  const price: string | null = pkg?.product?.priceString ?? null;
  // "Gratis testen" nur, wenn das Produkt wirklich eine kostenlose Testphase hat
  const hasFreeTrial = pkg?.product?.introPrice != null && Number(pkg.product.introPrice.price) === 0;
  const android = Platform.OS === 'android';
  const renewText = price
    ? t(android ? 'paywall.renewNoticeAndroid' : 'paywall.renewNotice', { price })
    : t(android ? 'paywall.renewNoticeNoPriceAndroid' : 'paywall.renewNoticeNoPrice');

  const openUrl = (url: string) => { Linking.openURL(url).catch(() => {}); };

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
      // purchasePackage meldet den Kauf zentral an alle useSubscription-Instanzen
      // (RevenueCat-Neuladen + Server-Sync) — der Pro-Status springt sofort um.
      const ok = await purchasePackage(pkg);
      // Paywall zuerst schließen; das Pro-Fenster wird von showProNotice erst nach
      // der Modal-Transition gezeigt (nie zwei Modals gleichzeitig).
      if (ok) { navigation.goBack(); showProNotice('success'); }
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
      if (ok) { navigation.goBack(); showProNotice('success'); }
      else    Alert.alert(t('common.error'), t('paywall.errors.restoreFailed'));
    } catch {
      Alert.alert(t('common.error'), t('paywall.errors.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };


  return (
    <View style={styles.root}>
      <AmbientBackground animated variant="paywall" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Schließen */}
          <View style={styles.closeRow}>
            <GlassIconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel={t('common.close')} />
          </View>

          {/* Kopf */}
          <PrezenceLogo variant="mark" height={96} style={{ marginTop: -2 }} />
          <Text style={styles.title} accessibilityRole="header">{t(titleKey)}</Text>
          <Text style={styles.subtitle}>{t(subtitleKey)}</Text>

          {/* Features */}
          <Card style={styles.features}>
            {FEATURE_KEYS.map((key, i) => (
              <React.Fragment key={key}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.featureRow}>
                  <CheckIcon color={T.accent} />
                  <Text style={styles.featureText}>{t(`paywall.features.${key}`, { limit: PRO_MONTHLY_LIMIT })}</Text>
                </View>
              </React.Fragment>
            ))}
          </Card>

          {/* Preis */}
          <View style={styles.priceCard}>
            <View style={{ gap: 2 }}>
              <Text style={styles.planName}>{t('paywall.monthly')}</Text>
              <Text style={styles.planSub}>{t('paywall.cancelAnytime')}</Text>
            </View>
            <View style={styles.priceRight}>
              <Text style={styles.priceNum}>{price ?? '–'}</Text>
              <Text style={styles.perMonth}>{t('paywall.perMonth')}</Text>
            </View>
          </View>

          <Button
            label={hasFreeTrial ? t('paywall.trialButton') : t('paywall.unlockButton')}
            onPress={handleSubscribe}
            loading={loading}
            fullWidth
            prominent
            style={{ marginTop: 6 }}
          />

          {/* Automatische Verlängerung (Apple 3.1.2) */}
          <Text style={styles.renew}>{renewText}</Text>

          {/* Links — eine Zeile, nicht umbrechen */}
          <View style={styles.links}>
            <Pressable onPress={handleRestore} disabled={restoring} style={styles.link} accessibilityRole="button">
              <Text style={[styles.linkText, styles.linkRestore]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {restoring ? t('common.loading') : t('paywall.restore')}
              </Text>
            </Pressable>
            <Pressable onPress={() => openUrl(TERMS_URL)} style={styles.link} accessibilityRole="link">
              <Text style={styles.linkText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('paywall.terms')}</Text>
            </Pressable>
            <Pressable onPress={() => openUrl(PRIVACY_URL)} style={styles.link} accessibilityRole="link">
              <Text style={styles.linkText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('paywall.privacy')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default PaywallScreen;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: SP.screen, paddingTop: SP.top, paddingBottom: 24, alignItems: 'center', gap: 6 },
  closeRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', height: 44 },

  title: {
    marginTop: 8, fontFamily: F.medium, fontSize: 36, lineHeight: 42, letterSpacing: -0.9,
    color: T.text, textAlign: 'center',
  },
  subtitle: {
    maxWidth: 300, fontFamily: F.regular, fontSize: 15, lineHeight: 22,
    color: T.textSecondary, textAlign: 'center',
  },

  features:    { alignSelf: 'stretch', marginTop: 14, paddingVertical: 4, paddingHorizontal: 20 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, height: 42 },
  featureText: { flex: 1, fontFamily: F.medium, fontSize: 15, color: T.text },
  divider:     { height: 1, backgroundColor: T.hairline },

  priceCard: {
    alignSelf: 'stretch', marginTop: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: R.card,
    backgroundColor: T.card, borderWidth: 1.5, borderColor: T.accent, boxShadow: T.shadowPrice,
  },
  planName:   { fontFamily: F.semiBold, fontSize: 15, color: T.text },
  planSub:    { fontFamily: F.regular, fontSize: 12.5, color: T.textSecondary },
  priceRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
  priceNum:   {
    fontFamily: F.regular, fontSize: 30, lineHeight: 32, letterSpacing: -0.9,
    color: T.text, fontVariant: ['tabular-nums'],
  },
  perMonth: { fontFamily: F.medium, fontSize: 13, color: T.textSecondary },

  renew: {
    marginTop: 4, maxWidth: 330, fontFamily: F.regular, fontSize: 11.5, lineHeight: 16,
    color: T.textSecondary, textAlign: 'center',
  },

  // Etwas breiter als der Seitenrand, damit alle drei Links in eine Zeile passen
  links:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: -14, alignSelf: 'stretch' },
  link:       { height: 44, justifyContent: 'center', paddingHorizontal: 5, flexShrink: 1 },
  linkText:   { fontFamily: F.medium, fontSize: 12, color: T.textSecondary },
  linkRestore:{ fontFamily: F.semiBold, color: T.accentText },
});
