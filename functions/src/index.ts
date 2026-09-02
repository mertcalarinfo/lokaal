import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const REGION = 'europe-west1';

// Öffentlicher RevenueCat-SDK-Key (bereits als publishable dokumentiert, siehe
// app.config.js) — reicht für den reinen Lesezugriff auf GET /subscribers/{id}.
// Wert kommt aus functions/.env (lokal) bzw. wird beim Deploy abgefragt.
const REVENUECAT_PUBLIC_KEY = defineString('REVENUECAT_IOS_API_KEY');
const PREMIUM_ENTITLEMENT_ID = 'premium'; // muss zu src/services/revenuecat.ts passen

/**
 * redeemAccessCode — löst einen Einmal-Zugangscode ein und setzt isPro=true.
 *
 * Sicherheit:
 *  - Nur authentifizierte Aufrufer (context.auth) — sonst `unauthenticated`.
 *  - Race-sicher über eine Firestore-Transaktion: ein bereits benutzter Code
 *    kann nicht erneut eingelöst werden (`failed-precondition`).
 *  - `users/{uid}.isPro` wird AUSSCHLIESSLICH hier (Admin SDK) gesetzt — der
 *    Client kann isPro per Security-Rules nicht selbst schreiben.
 */
export const redeemAccessCode = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  const raw = (request.data?.code ?? '') as string;
  const code = String(raw).trim().toUpperCase();
  if (!code) {
    throw new HttpsError('not-found', 'Invalid code.');
  }

  const codeRef = db.collection('accessCodes').doc(code);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(codeRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invalid code.');
    }
    const data = snap.data() as { used?: boolean } | undefined;
    if (data?.used === true) {
      throw new HttpsError('failed-precondition', 'Code already used.');
    }
    tx.update(codeRef, {
      used: true,
      usedBy: uid,
      usedAt: FieldValue.serverTimestamp(),
    });
    tx.set(userRef, { isPro: true }, { merge: true });
  });

  return { success: true };
});

/**
 * syncSubscriptionStatus — verifiziert den RevenueCat-Abo-Status server-seitig
 * (GET /subscribers/{uid} über die RevenueCat REST API, Public Key reicht für
 * Lesezugriff) und schreibt isPro/hadProBefore/proExpiredAt per Admin SDK.
 *
 * Sicherheit:
 *  - Nur authentifizierte Aufrufer (context.auth) — sonst `unauthenticated`.
 *  - Genau wie bei redeemAccessCode: der Client kann diese drei Felder laut
 *    firestore.rules nicht selbst schreiben, nur diese Function (Admin SDK).
 *  - `proExpiredAt` wird NUR beim tatsächlichen aktiv→inaktiv-Übergang gesetzt,
 *    nicht bei jedem erneuten "weiterhin inaktiv"-Check — der ursprüngliche
 *    Ablaufzeitpunkt bleibt so stabil.
 */
export const syncSubscriptionStatus = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const prior = (snap.exists ? snap.data() : {}) as {
    isPro?: boolean;
    hadProBefore?: boolean;
    proExpiredAt?: Timestamp;
  };

  let rcActive: boolean;
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${uid}`, {
      headers: { Authorization: `Bearer ${REVENUECAT_PUBLIC_KEY.value()}` },
    });
    if (!res.ok) {
      throw new Error(`RevenueCat API responded ${res.status}`);
    }
    const json = (await res.json()) as any;
    const ent = json?.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT_ID];
    rcActive =
      !!ent && (!ent.expires_date || new Date(ent.expires_date).getTime() > Date.now());
  } catch (err) {
    console.error('[syncSubscriptionStatus] RevenueCat verification failed:', err);
    throw new HttpsError('internal', 'Failed to verify subscription status.');
  }

  const update: Record<string, any> = {};
  let hadProBefore = prior.hadProBefore === true;
  let proExpiredAtOut: number | null = prior.proExpiredAt
    ? prior.proExpiredAt.toMillis()
    : null;

  if (rcActive) {
    update.isPro = true;
    if (!hadProBefore) {
      update.hadProBefore = true;
      hadProBefore = true;
    }
  } else if (prior.isPro === true) {
    // Aktiv -> inaktiv Übergang JETZT: einmaligen Ablaufzeitpunkt festhalten.
    const now = Timestamp.now();
    update.isPro = false;
    update.hadProBefore = true;
    update.proExpiredAt = now;
    hadProBefore = true;
    proExpiredAtOut = now.toMillis();
  } else if (hadProBefore) {
    // Bereits vorher abgelaufen — isPro synchron halten, proExpiredAt NICHT anfassen.
    update.isPro = false;
  }
  // sonst: nie Pro gehabt, RC weiterhin inaktiv -> keine Schreibung.

  if (Object.keys(update).length > 0) {
    await userRef.set(update, { merge: true });
  }

  return { isPro: rcActive, hadProBefore, proExpiredAt: proExpiredAtOut };
});
