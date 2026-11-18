import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString, defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

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
 *  - Geschützte Konten werden nie angefasst (kein Schreiben, kein RevenueCat-
 *    Aufruf), weil ihr Pro nicht aus RevenueCat stammt und "kein RC-Abo" sonst
 *    als Ablauf gewertet und Pro zurückgenommen würde:
 *      · `proOverride === true` im users-Dokument (manuell vergebenes Pro).
 *        Das Flag SCHÜTZT nur, es vergibt kein Pro — `isPro: true` muss
 *        zusammen damit gesetzt werden.
 *      · bereits eingelöster Zugangscode (accessCodes/{code}.usedBy == uid).
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
    proOverride?: boolean;
  };

  // Geschützte Konten (Pro nicht aus RevenueCat): unverändert lassen und den
  // gespeicherten Stand zurückgeben, damit der Client nichts überschreibt.
  let protectedBy: 'proOverride' | 'accessCode' | null = null;
  if (prior.proOverride === true) {
    protectedBy = 'proOverride';
  } else {
    const redeemed = await db
      .collection('accessCodes')
      .where('usedBy', '==', uid)
      .limit(1)
      .get();
    if (!redeemed.empty) protectedBy = 'accessCode';
  }
  if (protectedBy) {
    console.log('[syncSubscriptionStatus] protected account, no changes made', { protectedBy });
    return {
      isPro: prior.isPro === true,
      hadProBefore: prior.hadProBefore === true,
      proExpiredAt: prior.proExpiredAt ? prior.proExpiredAt.toMillis() : null,
    };
  }

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


// ─── Konto löschen (Apple 5.1.1(v)) ──────────────────────────────────────────

// Sign in with Apple: Token-Widerruf über Apples REST-API (/auth/token → /auth/revoke).
// Team-ID und Key-ID sind nicht geheim (functions/.env), der .p8-Schlüssel schon
// (Secret Manager: `firebase functions:secrets:set APPLE_PRIVATE_KEY`).
const APPLE_TEAM_ID     = defineString('APPLE_TEAM_ID');
const APPLE_KEY_ID      = defineString('APPLE_KEY_ID');
const APPLE_PRIVATE_KEY = defineSecret('APPLE_PRIVATE_KEY');
const APPLE_CLIENT_ID   = 'com.prezence.ios'; // Bundle-ID = client_id bei nativer Anmeldung
const RECENT_LOGIN_SECONDS = 5 * 60;

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** client_secret für Apple: ES256-JWT, mit dem .p8-Schlüssel signiert (5 Min gültig). */
function appleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'ES256', kid: APPLE_KEY_ID.value(), typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: APPLE_TEAM_ID.value(),
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  }));
  const key = createPrivateKey(APPLE_PRIVATE_KEY.value().replace(/\n/g, '\n'));
  const signature = cryptoSign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64url(signature)}`;
}

/** Tauscht den frischen authorizationCode gegen ein Token und widerruft es bei Apple. */
async function revokeAppleToken(authorizationCode: string): Promise<boolean> {
  const clientSecret = appleClientSecret();
  const form = (fields: Record<string, string>) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });

  const tokenRes = await fetch('https://appleid.apple.com/auth/token', form({
    client_id: APPLE_CLIENT_ID,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
  }));
  const tokenJson: any = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    console.error('[deleteAccount] Apple /auth/token failed', tokenRes.status, tokenJson?.error);
    return false;
  }
  const token = tokenJson.refresh_token ?? tokenJson.access_token;
  const hint  = tokenJson.refresh_token ? 'refresh_token' : 'access_token';
  if (!token) return false;

  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', form({
    client_id: APPLE_CLIENT_ID,
    client_secret: clientSecret,
    token,
    token_type_hint: hint,
  }));
  if (!revokeRes.ok) console.error('[deleteAccount] Apple /auth/revoke failed', revokeRes.status);
  return revokeRes.ok;
}

/** Löscht alle Dokumente einer Collection mit userId == uid (in Batches). */
async function deleteByUser(collection: string, uid: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await db.collection(collection).where('userId', '==', uid).limit(400).get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
}

/**
 * deleteAccount — löscht das Konto des Aufrufers endgültig:
 * users/{uid}, alle reports + comparisons (userId == uid), Storage videos/{uid}/
 * und profilePictures/{uid}, Apple-Token (bei "Mit Apple angemeldet"), dann den
 * Auth-User. Ein laufendes App-Store-Abo wird dadurch NICHT gekündigt.
 *
 * Sicherheit: nur der angemeldete Nutzer selbst, und nur mit frischer Anmeldung
 * (auth_time ≤ 5 Min) — sonst `failed-precondition` / "requires-recent-login",
 * die App meldet den Nutzer dann neu an und ruft erneut auf.
 */
export const deleteAccount = onCall(
  { region: REGION, secrets: [APPLE_PRIVATE_KEY], timeoutSeconds: 120 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Login required.');

    const authTime = Number(request.auth?.token?.auth_time ?? 0);
    if (!authTime || Date.now() / 1000 - authTime > RECENT_LOGIN_SECONDS) {
      throw new HttpsError('failed-precondition', 'requires-recent-login');
    }

    const authUser = await getAuth().getUser(uid);
    const isApple = authUser.providerData.some((p) => p.providerId === 'apple.com');
    const appleCode = typeof request.data?.appleAuthorizationCode === 'string'
      ? request.data.appleAuthorizationCode as string
      : '';
    if (isApple && !appleCode) {
      // Ohne frischen Code kann Apple das Token nicht widerrufen — die App holt ihn vorher.
      throw new HttpsError('failed-precondition', 'apple-authorization-required');
    }

    let appleRevoked: boolean | null = null;
    if (isApple) {
      try {
        appleRevoked = await revokeAppleToken(appleCode);
      } catch (err) {
        console.error('[deleteAccount] Apple revoke error', err);
        appleRevoked = false;
      }
    }

    const reports = await deleteByUser('reports', uid);
    const comparisons = await deleteByUser('comparisons', uid);
    await db.collection('users').doc(uid).delete();

    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `videos/${uid}/` }).catch((err) =>
      console.error('[deleteAccount] video delete error', err));
    await bucket.file(`profilePictures/${uid}`).delete({ ignoreNotFound: true }).catch((err) =>
      console.error('[deleteAccount] profile picture delete error', err));

    await getAuth().deleteUser(uid);

    console.log(`[deleteAccount] ${uid}: reports=${reports} comparisons=${comparisons} apple=${appleRevoked}`);
    return { ok: true, appleRevoked };
  },
);
