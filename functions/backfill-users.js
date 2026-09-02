/**
 * Einmaliges Backfill-Skript — ergänzt fehlende Pflichtfelder in allen
 * users/{uid}-Dokumenten in Firestore.
 *
 * Ausführung (aus dem functions/-Verzeichnis):
 *   node backfill-users.js
 *
 * Voraussetzung: Application Default Credentials sind gesetzt.
 * Falls noch nicht geschehen:
 *   gcloud auth application-default login
 * ODER: GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node backfill-users.js
 *
 * Nie überschrieben:
 *   isPro    — nur die Cloud Function redeemAccessCode darf dieses Feld setzen
 *   language — fehlendes language triggert absichtlich die Sprachauswahl für neue Nutzer
 */

'use strict';

const admin = require('firebase-admin');

// Credentials: bevorzugt serviceAccount.json im selben Verzeichnis,
// sonst Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS / gcloud).
const path = require('path');
const fs   = require('fs');
const saPath = path.join(__dirname, 'serviceAccount.json');
const credential = fs.existsSync(saPath)
  ? admin.credential.cert(saPath)
  : admin.credential.applicationDefault();

admin.initializeApp({ credential, projectId: 'prezence-app-1' });

const db = admin.firestore();
const auth = admin.auth();

// Standardwerte für alle Pflichtfelder (ohne isPro und language)
const FIELD_DEFAULTS = {
  email:               null,         // wird aus Firebase Auth befüllt (s.u.)
  displayName:         null,         // wird aus Firebase Auth befüllt (s.u.)
  onboardingCompleted: false,
  onboardingAnswers:   {},
  usageMonth:          '',
  usageCount:          0,
  photoURL:            null,
  createdAt:           null,         // wird als serverTimestamp gesetzt falls fehlend
};

async function backfill() {
  console.log('Lade alle users-Dokumente aus Firestore…');
  const snapshot = await db.collection('users').get();
  console.log(`${snapshot.size} Dokument(e) gefunden.\n`);

  let updated = 0;
  let skipped = 0;
  let errors  = 0;

  for (const doc of snapshot.docs) {
    const uid  = doc.id;
    const data = doc.data();

    // Firebase Auth-Daten für email/displayName-Fallback laden
    let authUser = null;
    try {
      authUser = await auth.getUser(uid);
    } catch {
      console.warn(`  [WARN] Auth-User für ${uid} nicht gefunden — email/displayName-Fallback entfällt.`);
    }

    const missing = {};

    if (!('email' in data))
      missing.email = authUser?.email ?? '';

    if (!('displayName' in data))
      missing.displayName = authUser?.displayName ?? '';

    if (!('onboardingCompleted' in data))
      missing.onboardingCompleted = false;

    if (!('onboardingAnswers' in data))
      missing.onboardingAnswers = {};

    if (!('usageMonth' in data))
      missing.usageMonth = '';

    if (!('usageCount' in data))
      missing.usageCount = 0;

    if (!('photoURL' in data))
      missing.photoURL = null;

    if (!('createdAt' in data))
      missing.createdAt = admin.firestore.FieldValue.serverTimestamp();

    if (Object.keys(missing).length === 0) {
      console.log(`[SKIP]   ${uid} — alle Felder vorhanden`);
      skipped++;
      continue;
    }

    console.log(`[UPDATE] ${uid} — ergänze: ${Object.keys(missing).join(', ')}`);
    try {
      await doc.ref.set(missing, { merge: true });
      updated++;
    } catch (err) {
      console.error(`[ERROR]  ${uid} — Write fehlgeschlagen:`, err.code, err.message);
      errors++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`Fertig. Aktualisiert: ${updated}  |  Übersprungen: ${skipped}  |  Fehler: ${errors}`);
  console.log('─────────────────────────────────');
}

backfill().catch((err) => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
