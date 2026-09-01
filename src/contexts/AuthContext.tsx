/**
 * AuthContext — single shared auth state for the entire app.
 *
 * Previously, each component called `useAuth()` which created its own
 * independent `useState` island. That meant `markOnboardingCompleted()`
 * in OnboardingScreen updated only that screen's state, and AppNavigator
 * kept seeing `onboardingCompleted: false`, causing the onboarding loop.
 *
 * Fix: move all state into this provider so every consumer shares one
 * instance. The public API is identical — all existing callers work
 * unchanged because `src/hooks/useAuth.ts` simply re-exports `useAuth`
 * from here.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '../services/firebase';
import { saveUserProfile, getUserProfile } from '../services/storage';
import { redeemAccessCode } from '../services/access';
import { User, OnboardingAnswers } from '../types';
import ProUnlockedModal, { ProNoticeKind } from '../components/ProUnlockedModal';

// AsyncStorage key — scoped per user so switching accounts doesn't bleed
const onboardingKey = (uid: string) => `@prezence:onboarding_${uid}`;
// Zugangscode, der vor dem Login eingegeben wurde — wird nach Anmeldung eingelöst.
const PENDING_CODE_KEY = '@prezence:pendingProCode';

// ─── User-Dokument-Normalisierung ────────────────────────────────────────────
// Gibt ein Objekt mit AUSSCHLIESSLICH den Feldern zurück, die im Firestore-Dokument
// noch fehlen. Felder die bereits vorhanden sind werden NICHT in das Ergebnis
// aufgenommen — saveUserProfile(..., result) überschreibt daher nie bestehende Werte.
//
// Bewusst ausgelassen:
//   isPro    — Firestore-Regel blockiert jeden Client-Write auf dieses Feld
//   language — fehlendes language ist für neue Nutzer gewollt (triggert LanguageSelect)
function normalizeUserDoc(
  fbUser: { email: string | null; displayName: string | null },
  profile: Record<string, any> | null
): Record<string, any> {
  const doc = profile ?? {};
  const missing: Record<string, any> = {};

  if (!('email' in doc))               missing.email               = fbUser.email ?? '';
  if (!('displayName' in doc))         missing.displayName         = fbUser.displayName ?? '';
  if (!('onboardingCompleted' in doc)) missing.onboardingCompleted = false;
  if (!('onboardingAnswers' in doc))   missing.onboardingAnswers   = {};
  if (!('usageMonth' in doc))          missing.usageMonth          = '';
  if (!('usageCount' in doc))          missing.usageCount          = 0;
  if (!('photoURL' in doc))            missing.photoURL            = null;
  if (!('createdAt' in doc))           missing.createdAt           = new Date();

  return missing;
}

/**
 * Löst einen vor dem Login zwischengespeicherten Code ein (sobald ein Account
 * authentifiziert ist). Bei Erfolg oder endgültigem Fehlschlag (ungültig/benutzt)
 * wird der Pending-Code entfernt; bei transienten Fehlern bleibt er für den nächsten Versuch.
 */
async function tryRedeemPendingCode(
  fbUser: any,
  markPro: () => void,
  notify: (kind: ProNoticeKind) => void
): Promise<void> {
  try {
    const code = await AsyncStorage.getItem(PENDING_CODE_KEY);
    if (!code) return;

    // Code sofort löschen — unabhängig vom Ergebnis. Verhindert dass andere
    // Accounts auf demselben Gerät beim nächsten Login denselben Code aufgreifen.
    await AsyncStorage.removeItem(PENDING_CODE_KEY);

    // ID-Token explizit auffrischen, bevor der authentifizierte Function-Call
    // gemacht wird. Ohne force-refresh kann der Token in onAuthStateChanged noch
    // nicht vollständig bereit sein → Cloud Function wirft "unauthenticated".
    await fbUser.getIdToken(true);

    const res = await redeemAccessCode(code);
    if (res.success) {
      markPro();
      notify('success');
    } else if (res.reason === 'invalid') {
      notify('invalid');
    } else if (res.reason === 'used') {
      notify('used');
    } else {
      notify('network');
    }
  } catch {
    notify('network');
  }
}

interface AuthState {
  user: User | null;
  firebaseUser: any | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  updateLanguage: (language: 'en' | 'de') => Promise<void>;
  // Persist a new profile picture URL (already uploaded to Storage) to state + Firestore.
  updatePhotoURL: (photoURL: string) => Promise<void>;
  // Zugangscode-Einlösung (Pro-Status). redeemCodeNow: eingeloggter Nutzer, sofort.
  // stageAccessCode: vor dem Login zwischenspeichern, Einlösung nach Anmeldung.
  redeemCodeNow: (code: string) => Promise<import('../services/access').RedeemResult>;
  stageAccessCode: (code: string) => Promise<void>;
  markOnboardingCompleted: () => Promise<void>;
  // Save goals + mark onboarding done in one step (new-user intro flow).
  completeOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  // Update goals without touching onboardingCompleted (Settings edit flow).
  saveOnboardingAnswers: (answers: OnboardingAnswers) => Promise<void>;
  clearError: () => void;
  showProNotice: (kind: ProNoticeKind) => void;
  // DEV ONLY — remove before release
  skipLogin: () => void;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proNotice, setProNotice] = useState<ProNoticeKind | null>(null);
  // DEV ONLY — prevents onAuthStateChanged from overwriting the mock user
  const devSkipped = useRef(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
      // DEV ONLY — skip if web bypass is active
      if (devSkipped.current) return;
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Check AsyncStorage FIRST — it is our local source of truth for
          // onboarding. We write there synchronously during markOnboardingCompleted,
          // so this can never be behind Firestore in a way that would cause a reset.
          const [profile, localOnboarding] = await Promise.all([
            getUserProfile(fbUser.uid),
            AsyncStorage.getItem(onboardingKey(fbUser.uid)),
          ]);

          // Fehlende Pflichtfelder im Firestore-Dokument ergänzen (Hintergrund-Write,
          // nie await — kein Einfluss auf Ladezeit oder bestehende Felder).
          const missing = normalizeUserDoc(fbUser, profile);
          console.log('[AuthContext] normalizeUserDoc:', JSON.stringify(missing));
          if (Object.keys(missing).length > 0) {
            saveUserProfile(fbUser.uid, missing).catch((err: any) =>
              console.warn('[AuthContext] normalizeUserDoc write FAILED:', err?.code, err?.message)
            );
          }

          const onboardingCompleted =
            localOnboarding === 'true' || (profile?.onboardingCompleted ?? false);

          const appUser: User = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || profile?.displayName || '',
            language: profile?.language || undefined,
            onboardingCompleted,
            onboardingAnswers: profile?.onboardingAnswers || undefined,
            photoURL: profile?.photoURL || fbUser.photoURL || undefined,
            isPro: profile?.isPro === true,
            usageMonth: profile?.usageMonth || undefined,
            usageCount: profile?.usageCount ?? 0,
            createdAt: profile?.createdAt?.toDate?.() || new Date(),
          };
          setUser(appUser);

          // Vor dem Login eingegebener Zugangscode wird jetzt eingelöst (Account ist authentifiziert).
          tryRedeemPendingCode(
            fbUser,
            () => setUser((p) => (p ? { ...p, isPro: true } : p)),
            setProNotice
          );
        } catch {
          // Profile fetch failed — treat as new user with no language set.
          // Do NOT override onboardingCompleted if AsyncStorage says true.
          try {
            const localOnboarding = await AsyncStorage.getItem(
              onboardingKey(fbUser.uid)
            );
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || '',
              language: undefined,
              onboardingCompleted: localOnboarding === 'true',
              createdAt: new Date(),
            });
          } catch {
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || '',
              language: undefined,
              onboardingCompleted: false,
              createdAt: new Date(),
            });
          }
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const auth = getAuth();
    if (!auth) throw new Error('AUTH_NOT_INITIALIZED');

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err: any) {
      setError(err.code || 'generic');
      throw err;
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      setError(null);
      const auth = getAuth();
      if (!auth) throw new Error('AUTH_NOT_INITIALIZED');

      try {
        const credential = await auth.createUserWithEmailAndPassword(
          email,
          password
        );
        const fbUser = credential.user;

        await fbUser.updateProfile({ displayName: name });

        // Save profile WITHOUT language — forces LanguageSelect to appear
        await saveUserProfile(fbUser.uid, {
          uid: fbUser.uid,
          email,
          displayName: name,
          onboardingCompleted: false,
          createdAt: new Date(),
        });

        // Explicitly update React state so the app navigates immediately.
        // On Android, onAuthStateChanged fires asynchronously and the app
        // would freeze on the splash screen if we rely on it alone.
        // onAuthStateChanged will fire again later and overwrite this — that
        // is fine because the resulting state is identical.
        setUser({
          uid: fbUser.uid,
          email,
          displayName: name,
          language: undefined, // No language yet → triggers LanguageSelect
          onboardingCompleted: false,
          createdAt: new Date(),
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.code || 'generic');
        throw err;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    setError(null);
    const auth = getAuth();
    if (!auth) return;

    try {
      try {
        const { resetUser } = await import('../services/revenuecat');
        await resetUser();
      } catch {
        // ignore
      }

      await auth.signOut();
    } catch (err: any) {
      setError(err.code || 'generic');
      throw err;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getAuth();
    if (!auth) throw new Error('AUTH_NOT_INITIALIZED');

    try {
      const { GoogleSignin } = await import(
        '@react-native-google-signin/google-signin'
      );

      GoogleSignin.configure({
        // Web-Client-ID aus google-services.json (client_type: 3)
        webClientId: '870921496071-c39cqnb9mhh693bdf3rviutshs2km1tj.apps.googleusercontent.com',
      });

      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();

      const GoogleAuthProvider =
        require('@react-native-firebase/auth').default.GoogleAuthProvider;
      const googleCredential = GoogleAuthProvider.credential(idToken);

      const credential = await auth.signInWithCredential(googleCredential);
      const fbUser = credential.user;

      // New Google users: save profile WITHOUT language to trigger LanguageSelect
      if (credential.additionalUserInfo?.isNewUser) {
        await saveUserProfile(fbUser.uid, {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || '',
          onboardingCompleted: false,
          createdAt: new Date(),
        });
      }
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED') {
        setError(err.code || 'generic');
        throw err;
      }
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setError(null);
    const auth = getAuth();
    if (!auth) throw new Error('AUTH_NOT_INITIALIZED');

    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const Crypto = await import('expo-crypto');

      // Firebase requires the RAW nonce in AppleAuthProvider.credential(), while
      // Apple's request must carry its SHA256 HASH — mixing these up makes
      // signInWithCredential reject the token as invalid.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const AppleAuthProvider =
        require('@react-native-firebase/auth').default.AppleAuthProvider;
      const firebaseCredential = AppleAuthProvider.credential(
        appleCredential.identityToken,
        rawNonce
      );

      const credential = await auth.signInWithCredential(firebaseCredential);
      const fbUser = credential.user;

      // New Apple users: unlike Google, Firebase does NOT auto-populate
      // displayName from the Apple credential — set it explicitly. Apple only
      // returns fullName/email on the very first authorization ever, so this
      // must happen now or the name is lost.
      if (credential.additionalUserInfo?.isNewUser) {
        const givenName = appleCredential.fullName?.givenName ?? '';
        const familyName = appleCredential.fullName?.familyName ?? '';
        const displayName = `${givenName} ${familyName}`.trim();

        if (displayName) {
          await fbUser.updateProfile({ displayName });
        }

        await saveUserProfile(fbUser.uid, {
          uid: fbUser.uid,
          email: fbUser.email || appleCredential.email || '',
          displayName: displayName || fbUser.displayName || '',
          onboardingCompleted: false,
          createdAt: new Date(),
        });
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        setError(err.code || 'generic');
        throw err;
      }
    }
  }, []);

  const updateLanguage = useCallback(
    async (language: 'en' | 'de') => {
      if (!user) return;
      const prevLanguage = user.language;

      // Optimistic update: reflect the new language in React state immediately
      // so the UI re-renders cleanly in one pass alongside the i18n change,
      // without waiting for the Firestore round-trip to complete.
      setUser((prev) => (prev ? { ...prev, language } : null));

      try {
        await saveUserProfile(user.uid, { language });
      } catch (err: any) {
        // Revert to the previous language if the Firestore write fails
        setUser((prev) => (prev ? { ...prev, language: prevLanguage } : null));
        setError(err.message);
        throw err;
      }
    },
    [user]
  );

  const updatePhotoURL = useCallback(
    async (photoURL: string) => {
      if (!user) return;
      const prev = user.photoURL;
      // Optimistisch: sofort im UI anzeigen.
      setUser((p) => (p ? { ...p, photoURL } : null));
      try {
        await saveUserProfile(user.uid, { photoURL });
      } catch (err: any) {
        setUser((p) => (p ? { ...p, photoURL: prev } : null));
        setError(err.message);
        throw err;
      }
    },
    [user]
  );

  // Eingeloggter Nutzer löst sofort ein. Bei Erfolg lokal isPro=true spiegeln + Modal zeigen.
  const redeemCodeNow = useCallback(async (code: string) => {
    const res = await redeemAccessCode(code);
    if (res.success) {
      setUser((p) => (p ? { ...p, isPro: true } : p));
      setProNotice('success');
    }
    return res;
  }, []);

  // Vor dem Login: Code nur zwischenspeichern — Einlösung nach Anmeldung.
  const stageAccessCode = useCallback(async (code: string) => {
    await AsyncStorage.setItem(PENDING_CODE_KEY, code.trim().toUpperCase());
  }, []);

  const markOnboardingCompleted = useCallback(async () => {
    if (!user) return;

    // 1. Write to AsyncStorage FIRST — this is synchronous local storage and
    //    is the source of truth. Even if Firestore fails or onAuthStateChanged
    //    fires again, this value will prevent the state from being reset to false.
    await AsyncStorage.setItem(onboardingKey(user.uid), 'true');

    // 2. Update React state — AppNavigator re-renders immediately because
    //    all consumers share this single provider instance.
    setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));

    // 3. Persist to Firestore in the background. We do NOT await this and we
    //    do NOT revert state on failure — AsyncStorage already holds the truth.
    saveUserProfile(user.uid, { onboardingCompleted: true }).catch(
      (err: any) => {
        console.warn(
          '[useAuth] Firestore onboarding write failed (AsyncStorage is still set):',
          err?.message
        );
      }
    );
  }, [user]);

  // Save coaching goals AND mark onboarding complete (new-user intro flow).
  // AsyncStorage is written first so onboardingCompleted survives any Firestore
  // failure, identical to markOnboardingCompleted's guarantee.
  const completeOnboarding = useCallback(
    async (answers: OnboardingAnswers) => {
      if (!user) return;
      await AsyncStorage.setItem(onboardingKey(user.uid), 'true');
      setUser((prev) =>
        prev
          ? { ...prev, onboardingAnswers: answers, onboardingCompleted: true }
          : null
      );
      saveUserProfile(user.uid, {
        onboardingAnswers: answers,
        onboardingCompleted: true,
      }).catch((err: any) => {
        console.warn(
          '[useAuth] Firestore onboarding write failed (AsyncStorage is still set):',
          err?.message
        );
      });
    },
    [user]
  );

  // Update goals only (Settings edit flow). Optimistic: state updates first,
  // Firestore write happens in the background.
  const saveOnboardingAnswers = useCallback(
    async (answers: OnboardingAnswers) => {
      if (!user) return;
      setUser((prev) => (prev ? { ...prev, onboardingAnswers: answers } : null));
      saveUserProfile(user.uid, { onboardingAnswers: answers }).catch(
        (err: any) => {
          console.warn('[useAuth] Firestore goals write failed:', err?.message);
        }
      );
    },
    [user]
  );

  const clearError = useCallback(() => setError(null), []);

  // DEV ONLY — bypasses Firebase and lands directly on MainNavigator
  const skipLogin = useCallback(() => {
    devSkipped.current = true;
    setUser({
      uid: 'dev-test-user',
      email: 'test@prezence.dev',
      displayName: 'Test User',
      language: 'en',
      onboardingCompleted: true,
      createdAt: new Date(),
    });
    setLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    updateLanguage,
    updatePhotoURL,
    redeemCodeNow,
    stageAccessCode,
    markOnboardingCompleted,
    completeOnboarding,
    saveOnboardingAnswers,
    clearError,
    showProNotice: setProNotice,
    skipLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ProUnlockedModal kind={proNotice} onClose={() => setProNotice(null)} />
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth — consume the shared auth context.
 *
 * Must be called inside a component that is a descendant of `<AuthProvider>`.
 * All callers share the same state, so a `setUser` call in OnboardingScreen
 * is immediately visible to AppNavigator without any re-mount or navigation.
 */
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuth must be used within an <AuthProvider>. ' +
        'Wrap your root component (App.tsx) with <AuthProvider>.'
    );
  }
  return ctx;
};
