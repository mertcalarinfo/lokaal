import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Subscription } from '../types';

// Keys are injected at build time via app.config.js → extra. The Android
// sandbox key remains as a fallback for development. Replace the iOS key by
// setting REVENUECAT_IOS_KEY (EAS secret / .env) before App Store builds.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const REVENUECAT_API_KEY_IOS =
  extra.revenueCatIosKey || 'YOUR_REVENUECAT_IOS_API_KEY';
const REVENUECAT_API_KEY_ANDROID =
  extra.revenueCatAndroidKey || 'test_oEswHVrjJiDqyaBlKNFltnENDne';
const PREMIUM_ENTITLEMENT_ID = 'premium';

let isInitialized = false;
let Purchases: any = null;

// RevenueCat public SDK keys are store-prefixed: Apple "appl_", Google "goog_".
// A key that is empty, a "YOUR_..." placeholder, or the wrong store format must
// NEVER reach the native Purchases.configure() call — an unusable key makes the
// SDK abort the whole app natively (SIGABRT / "abort() called"), which a JS
// try/catch cannot rescue. When the key is unusable we skip initialisation
// entirely: purchases stay disabled while the rest of the app keeps working.
const isUsableKey = (key: string, platform: string): boolean => {
  if (!key || key.startsWith('YOUR_')) return false;
  if (platform === 'ios') return key.startsWith('appl_');
  return true; // android: keep existing leniency (sandbox key)
};

const initializeRevenueCat = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // NOTE: Platform is imported statically at the top. Do NOT use a dynamic
    // `import('react-native')` here — that namespace import makes Metro enumerate
    // every react-native export and invoke deprecated getters (PushNotificationIOS),
    // which under the New Architecture constructs `new NativeEventEmitter(null)`
    // and crashes the app at startup (Invariant Violation).
    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    // Don't try to configure with a placeholder key — that throws natively and
    // leaves the SDK in a half-initialised state. Skip cleanly so the paywall
    // can show an informative message instead of crashing.
    if (!isUsableKey(apiKey, Platform.OS)) {
      console.warn(
        `[RevenueCat] No usable API key for ${Platform.OS} — purchases disabled. ` +
          `Set REVENUECAT_${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}_KEY to enable.`
      );
      return;
    }

    const { default: PurchasesModule, LOG_LEVEL } = await import(
      'react-native-purchases'
    );
    Purchases = PurchasesModule;

    // Verbose logs help diagnose store/offering issues in production builds.
    try {
      Purchases.setLogLevel?.(LOG_LEVEL?.DEBUG ?? 'DEBUG');
    } catch {
      // older SDKs — ignore
    }

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
