import { firebase } from '@react-native-firebase/functions';

// Muss exakt mit der Deploy-Region der Cloud Function übereinstimmen.
const FUNCTIONS_REGION = 'europe-west1';

export type RedeemReason = 'invalid' | 'used' | 'unauthenticated' | 'error';
export type RedeemResult =
  | { success: true }
  | { success: false; reason: RedeemReason; debug?: string };

/**
 * Löst einen Zugangscode über die Cloud Function ein (race-sicher, serverseitig).
 * Setzt bei Erfolg dauerhaft `users/{uid}.isPro = true` — der Client schreibt isPro NIE selbst.
 * Erfordert einen eingeloggten Nutzer (die Function prüft context.auth).
 */
export const redeemAccessCode = async (rawCode: string): Promise<RedeemResult> => {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { success: false, reason: 'invalid' };

  try {
    const callable = firebase
      .app()
      .functions(FUNCTIONS_REGION)
      .httpsCallable('redeemAccessCode');
    await callable({ code });
    return { success: true };
  } catch (err: any) {
    const c: string = err?.code || '';
    const debug = `${err?.code ?? '(no code)'} — ${err?.message ?? err}`;
    console.warn('[access] redeemAccessCode failed:', debug);

    if (c.includes('not-found'))           return { success: false, reason: 'invalid', debug };
    if (c.includes('failed-precondition')) return { success: false, reason: 'used', debug };
    if (c.includes('unauthenticated'))     return { success: false, reason: 'unauthenticated', debug };
    return { success: false, reason: 'error', debug };
  }
};
