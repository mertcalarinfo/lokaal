import { getAuth } from './firebase';

// Muss exakt mit der Deploy-Region der Cloud Functions übereinstimmen.
const FUNCTIONS_REGION = 'europe-west1';
const GOOGLE_WEB_CLIENT_ID = '870921496071-c39cqnb9mhh693bdf3rviutshs2km1tj.apps.googleusercontent.com';

export type AuthProviderKind = 'apple' | 'google' | 'password' | 'other';

/** Mit welchem Anbieter ist der aktuelle Nutzer angemeldet? */
export function currentProvider(): AuthProviderKind {
  const user = getAuth()?.currentUser;
  const ids: string[] = (user?.providerData ?? []).map((p: any) => p.providerId);
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('password')) return 'password';
  return 'other';
}

/**
 * Sign in with Apple erneut anfragen: liefert eine frische Anmeldung (für die
 * "recent login"-Prüfung) UND einen frischen authorizationCode, mit dem die
 * Cloud Function das Apple-Token widerrufen kann.
 */
async function reauthWithApple(): Promise<string> {
  const auth = getAuth();
  const AppleAuthentication = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const apple = await AppleAuthentication.signInAsync({ requestedScopes: [], nonce: hashedNonce });
  const AppleAuthProvider = require('@react-native-firebase/auth').default.AppleAuthProvider;
  await auth.currentUser.reauthenticateWithCredential(AppleAuthProvider.credential(apple.identityToken, rawNonce));
  if (!apple.authorizationCode) throw new Error('APPLE_NO_AUTH_CODE');
  return apple.authorizationCode;
}

async function reauthWithGoogle(): Promise<void> {
  const auth = getAuth();
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  const { idToken } = await GoogleSignin.signIn() as any;
  const GoogleAuthProvider = require('@react-native-firebase/auth').default.GoogleAuthProvider;
  await auth.currentUser.reauthenticateWithCredential(GoogleAuthProvider.credential(idToken));
}

async function reauthWithPassword(password: string): Promise<void> {
  const auth = getAuth();
  const EmailAuthProvider = require('@react-native-firebase/auth').default.EmailAuthProvider;
  await auth.currentUser.reauthenticateWithCredential(EmailAuthProvider.credential(auth.currentUser.email, password));
}

async function callDeleteAccount(appleAuthorizationCode?: string) {
  const { firebase } = await import('@react-native-firebase/functions');
  const callable = firebase.app().functions(FUNCTIONS_REGION).httpsCallable('deleteAccount', { timeout: 120000 });
  return callable({ appleAuthorizationCode: appleAuthorizationCode ?? null });
}

const isRecentLoginError = (err: any) =>
  String(err?.message ?? '').includes('requires-recent-login') ||
  String(err?.code ?? '').includes('requires-recent-login');

export class AccountDeletionCancelled extends Error {
  constructor() { super('cancelled'); }
}

/**
 * Konto endgültig löschen (Apple 5.1.1(v)). Die eigentliche Löschung macht die
 * Cloud Function `deleteAccount` (Daten, Dateien, Auth-User, Apple-Token).
 *
 * Apple-Nutzer melden sich vorher immer kurz neu an (frischer Code für den
 * Widerruf). Bei allen anderen: meldet die Function "requires-recent-login",
 * wird neu angemeldet (Google bzw. Passwort über `askPassword`) und erneut
 * aufgerufen. Abbruch durch den Nutzer → AccountDeletionCancelled.
 */
export async function deleteAccount(askPassword: () => Promise<string | null>): Promise<void> {
  const provider = currentProvider();

  const reauth = async (): Promise<string | undefined> => {
    try {
      if (provider === 'apple') return await reauthWithApple();
      if (provider === 'google') { await reauthWithGoogle(); return undefined; }
      if (provider === 'password') {
        const pw = await askPassword();
        if (!pw) throw new AccountDeletionCancelled();
        await reauthWithPassword(pw);
        return undefined;
      }
    } catch (err: any) {
      const code = String(err?.code ?? '');
      if (err instanceof AccountDeletionCancelled || code.includes('CANCELED') || code.includes('CANCELLED') || code === '-5') {
        throw new AccountDeletionCancelled();
      }
      throw err;
    }
    return undefined;
  };

  let appleCode: string | undefined;
  if (provider === 'apple') appleCode = await reauth();

  try {
    await callDeleteAccount(appleCode);
  } catch (err: any) {
    if (!isRecentLoginError(err)) throw err;
    appleCode = await reauth();
    await callDeleteAccount(appleCode);
  }

  // Lokal aufräumen: RevenueCat abmelden, Firebase-Sitzung beenden → Login
  try {
    const { resetUser } = await import('./revenuecat');
    await resetUser();
  } catch { /* ignorieren */ }
  try {
    await getAuth()?.signOut();
  } catch { /* Nutzer existiert serverseitig nicht mehr — lokale Sitzung ist trotzdem weg */ }
}
