import { Subscription } from '../types';

const REVENUECAT_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_API_KEY';
const REVENUECAT_API_KEY_ANDROID = 'test_oEswHVrjJiDqyaBlKNFltnENDne';
const PREMIUM_ENTITLEMENT_ID = 'premium';

let isInitialized = false;
let Purchases: any = null;

const initializeRevenueCat = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    const { default: PurchasesModule } = await import('react-native-purchases');
    Purchases = PurchasesModule;

    const { Platform } = await import('react-native');
    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    console.log('[RevenueCat] Initializing for platform:', Platform.OS, '— key prefix:', apiKey.slice(0, 8));
    Purchases.configure({ apiKey });
    isInitialized = true;
    console.log('[RevenueCat] Initialized successfully');
  } catch (error: any) {
    console.error('[RevenueCat] Initialization failed:', error?.message, error);
    isInitialized = false;
  }
};

export const initRevenueCat = async (): Promise<void> => {
  await initializeRevenueCat();
};

export const identifyUser = async (userId: string): Promise<void> => {
  if (!isInitialized || !Purchases) return;
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.warn('RevenueCat identify user failed:', error);
  }
};

export const resetUser = async (): Promise<void> => {
  if (!isInitialized || !Purchases) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('RevenueCat reset user failed:', error);
  }
};

export const checkSubscription = async (): Promise<Subscription> => {
  const defaultFree: Subscription = {
    isActive: false,
    tier: 'free',
    analysesThisMonth: 0,
  };

  if (!isInitialized || !Purchases) {
    return defaultFree;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isActive =
      customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined;

    return {
      isActive,
      tier: isActive ? 'premium' : 'free',
      analysesThisMonth: 0, // This is tracked via Firestore, not RevenueCat
    };
  } catch (error) {
    console.warn('Failed to check subscription:', error);
    return defaultFree;
  }
};

export const getOfferings = async (): Promise<any | null> => {
  if (!isInitialized || !Purchases) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings?.current || null;
  } catch (error) {
    console.warn('Failed to get offerings:', error);
    return null;
  }
};

export const purchasePackage = async (pkg: any): Promise<boolean> => {
  if (!isInitialized || !Purchases) {
    console.error('[RevenueCat] purchasePackage called but SDK is not initialized. isInitialized:', isInitialized, 'Purchases:', !!Purchases);
    throw new Error('RevenueCat not available');
  }

  console.log('[RevenueCat] Purchasing package:', pkg?.product?.identifier ?? pkg?.identifier ?? '(unknown)');
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined;
    console.log('[RevenueCat] Purchase complete — premium active:', active);
    return active;
  } catch (error: any) {
    // Code '1' is user-cancelled — not an error, just a dismissal
    if (error?.code === '1' || error?.userCancelled === true) {
      console.log('[RevenueCat] Purchase cancelled by user');
      return false;
    }
    console.error('[RevenueCat] Purchase failed:', error?.message, 'code:', error?.code, error);
    throw error;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  if (!isInitialized || !Purchases) {
    throw new Error('RevenueCat not available');
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    throw error;
  }
};

export const presentPaywall = async (): Promise<boolean> => {
  // This is a simplified paywall trigger
  // In production, use RevenueCat's Paywalls SDK or navigate to custom paywall
  if (!isInitialized || !Purchases) return false;

  try {
    const offerings = await getOfferings();
    if (!offerings) return false;

    const monthlyPackage = offerings.monthly || offerings.availablePackages?.[0];
    if (!monthlyPackage) return false;

    return await purchasePackage(monthlyPackage);
  } catch (error) {
    console.warn('Paywall presentation failed:', error);
    return false;
  }
};
