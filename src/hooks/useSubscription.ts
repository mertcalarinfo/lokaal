import { useState, useEffect, useCallback } from 'react';
import { Subscription } from '../types';
import { checkSubscription, presentPaywall as rcPresentPaywall, initRevenueCat, identifyUser } from '../services/revenuecat';
import { getReportsByMonth } from '../services/storage';

const FREE_TIER_MONTHLY_LIMIT = 1;

interface SubscriptionHookState {
  subscription: Subscription;
  canAnalyze: boolean;
  isSubscribed: boolean;
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
  const [subscription, setSubscription] = useState<Subscription>({
    isActive: false,
    tier: 'free',
    analysesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    if (!userId) {
      setSubscription({ isActive: false, tier: 'free', analysesThisMonth: 0 });
      setLoading(false);
      return;
    }

    try {
      // Check RevenueCat subscription status
      const rcSub = await checkSubscription();

      // Count analyses this month from Firestore
      const now = new Date();
      let analysesThisMonth = 0;

      try {
        const reportsThisMonth = await getReportsByMonth(
          userId,
          now.getFullYear(),
          now.getMonth() + 1
        );
        analysesThisMonth = reportsThisMonth.length;
      } catch {
        // ignore Firestore errors
      }

      setSubscription({
        ...rcSub,
        analysesThisMonth,
      });
    } catch (error) {
      console.warn('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // When a real user ID becomes available, identify them with RevenueCat so
  // their purchase history is correctly associated. This must happen before
  // getOfferings / checkSubscription so entitlements are scoped to the user.
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
      if (result) {
        await refresh();
      }
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

  const isSubscribed = subscription.tier === 'premium' && subscription.isActive;
  const canAnalyze =
    isSubscribed || subscription.analysesThisMonth < FREE_TIER_MONTHLY_LIMIT;

  return {
    subscription,
    canAnalyze,
    isSubscribed,
    loading,
    refresh,
    presentPaywall,
    initForUser,
  };
};
