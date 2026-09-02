import { useState, useEffect, useCallback } from 'react';
import { Subscription } from '../types';
import { checkSubscription, presentPaywall as rcPresentPaywall, initRevenueCat, identifyUser, syncSubscriptionStatus } from '../services/revenuecat';
import { getMonthlyUsage } from '../services/storage';
import { useAuth } from './useAuth';

// Freemium-Limits (Analysen pro Kalendermonat)
const FREE_MONTHLY_LIMIT = 2;
const PRO_MONTHLY_LIMIT  = 15;

interface SubscriptionHookState {
  subscription: Subscription;
  /** Effektiver Pro-Status = RevenueCat-Entitlement ODER Firestore isPro. */
  isPro: boolean;
  /** Alias für Abwärtskompatibilität (Settings-Anzeige). */
  isSubscribed: boolean;
  /** Ob der Nutzer JEMALS Pro hatte (auch wenn aktuell abgelaufen). */
  hadProBefore: boolean;
  /** Zeitpunkt des letzten Pro-Ablaufs, oder null. */
  proExpiredAt: Date | null;
  /** Drei-Zustands-Signal für Paywall-Copy: nie Pro / aktuell aktiv / abgelaufen. */
  proState: 'never' | 'active' | 'expired';
  analysesThisMonth: number;
  monthlyLimit: number;
  canAnalyze: boolean;
  loading: boolean;
}

interface SubscriptionHookActions {
  refresh: () => Promise<void>;
  presentPaywall: () => Promise<boolean>;
  initForUser: (userId: string) => Promise<void>;
}

export const useSubscription = (
  userId: string | null
): SubscriptionHookState & SubscriptionHookActions => {
  const { user, applySubscriptionSync } = useAuth();
  const [rcActive,          setRcActive]          = useState(false);
  const [analysesThisMonth, setAnalysesThisMonth] = useState(0);
  const [loading,           setLoading]           = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    if (!userId) {
      setRcActive(false);
      setAnalysesThisMonth(0);
      setLoading(false);
      return;
    }

    try {
      // RevenueCat-Entitlement prüfen
      const rcSub = await checkSubscription();
      setRcActive(rcSub.tier === 'premium' && rcSub.isActive);

      // Server-seitige Verifikation + Persistierung (isPro/hadProBefore/proExpiredAt).
      // Fire-and-forget: blockiert die UI nicht — rcActive oben ist bereits sofort
      // verfügbar, AuthContext wird aktualisiert sobald die Antwort da ist.
      syncSubscriptionStatus().then((result) => {
        if (result) applySubscriptionSync(result);
      }).catch(() => {});

      // Monatszähler aus dem User-Doc (usageMonth/usageCount, Reset durch Monatsabgleich)
      try {
        setAnalysesThisMonth(await getMonthlyUsage(userId));
      } catch {
        setAnalysesThisMonth(0);
      }
    } catch (error) {
      console.warn('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, applySubscriptionSync]);

  // RevenueCat-User identifizieren, bevor Entitlements geprüft werden.
  useEffect(() => {
    if (!userId) return;
    identifyUser(userId).catch((err) => {
      console.warn('[useSubscription] identifyUser failed:', err);
    });
  }, [userId]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    try {
      const result = await rcPresentPaywall();
      if (result) await refresh();
      return result;
    } catch (error) {
      console.warn('Paywall presentation failed:', error);
      return false;
    }
  }, [refresh]);

  const initForUser = useCallback(async (uid: string) => {
    try {
      await initRevenueCat();
      await identifyUser(uid);
      await fetchSubscriptionData();
    } catch (error) {
      console.warn('Failed to init RevenueCat for user:', error);
    }
  }, [fetchSubscriptionData]);

  // Effektiver Pro-Status: echter Kauf (RevenueCat) ODER dauerhaftes isPro (Firestore/Code).
  const isPro = rcActive || user?.isPro === true;
  const hadProBefore = user?.hadProBefore === true;
  const proExpiredAt = user?.proExpiredAt ?? null;
  const proState: 'never' | 'active' | 'expired' = isPro ? 'active' : hadProBefore ? 'expired' : 'never';
  const monthlyLimit = isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
  const canAnalyze = analysesThisMonth < monthlyLimit;

  const subscription: Subscription = {
    isActive: isPro,
    tier: isPro ? 'premium' : 'free',
    analysesThisMonth,
  };

  return {
    subscription,
    isPro,
    isSubscribed: isPro,
    hadProBefore,
    proExpiredAt,
    proState,
    analysesThisMonth,
    monthlyLimit,
    canAnalyze,
    loading,
    refresh,
    presentPaywall,
    initForUser,
  };
};
