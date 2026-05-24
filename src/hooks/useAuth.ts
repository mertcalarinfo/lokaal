import { useState, useEffect, useCallback } from 'react';
import { getAuth } from '../services/firebase';
import { saveUserProfile, getUserProfile } from '../services/storage';
import { User } from '../types';

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
  clearError: () => void;
}

export const useAuth = (): AuthState & AuthActions => {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid);
          const appUser: User = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || profile?.displayName || '',
            // Only set language if explicitly saved — undefined triggers LanguageSelect
            language: profile?.language || undefined,
            onboardingCompleted: profile?.onboardingCompleted ?? false,
            createdAt: profile?.createdAt?.toDate?.() || new Date(),
          };
          setUser(appUser);
        } catch {
          // Profile fetch failed — treat as new user with no language set
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || '',
            language: undefined,
            onboardingCompleted: false,
            createdAt: new Date(),
          });
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

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    const auth = getAuth();
    if (!auth) throw new Error('AUTH_NOT_INITIALIZED');

    try {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
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
    } catch (err: any) {
      setError(err.code || 'generic');
      throw err;
    }
  }, []);

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
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

      GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      });

      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();

      const GoogleAuthProvider = require('@react-native-firebase/auth').default.GoogleAuthProvider;
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

      try {
        await saveUserProfile(user.uid, { language });
        setUser((prev) => (prev ? { ...prev, language } : null));
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [user]
  );

  const markOnboardingCompleted = useCallback(async () => {
    if (!user) return;

    try {
      await saveUserProfile(user.uid, { onboardingCompleted: true });
      setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));
    } catch (err: any) {
      console.warn('Failed to mark onboarding completed:', err);
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  return {
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
    clearError,
  };
};
