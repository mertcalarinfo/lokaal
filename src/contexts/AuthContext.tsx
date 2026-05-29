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
import { User, OnboardingAnswers } from '../types';

// AsyncStorage key — scoped per user so switching accounts doesn't bleed
const onboardingKey = (uid: string) => `@prezence:onboarding_${uid}`;

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
  updateLanguage: (language: 'en' | 'de') => Promise<void>;
  markOnboardingCompleted: () => Promise<void>;
  // Save goals + mark onboarding done in one step (new-user intro flow).
  completeOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  // Update goals without touching onboardingCompleted (Settings edit flow).
  saveOnboardingAnswers: (answers: OnboardingAnswers) => Promise<void>;
  clearError: () => void;
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

          const onboardingCompleted =
            localOnboarding === 'true' || (profile?.onboardingCompleted ?? false);

          const appUser: User = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || profile?.displayName || '',
            language: profile?.language || undefined,
            onboardingCompleted,
            onboardingAnswers: profile?.onboardingAnswers || undefined,
            createdAt: profile?.createdAt?.toDate?.() || new Date(),
          };
          setUser(appUser);
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
        webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
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
    updateLanguage,
    markOnboardingCompleted,
    completeOnboarding,
    saveOnboardingAnswers,
    clearError,
    skipLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
