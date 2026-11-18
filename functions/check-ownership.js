// Nur lesend: zählt Dokumente, deren userId die neuen Firestore-Regeln nicht erfüllen würde.
// Vor dem Deploy der Regeln ausführen:  cd functions && node check-ownership.js
// Gibt nur Zahlen aus, keine Inhalte.
const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, 'serviceAccount.json'))) });
const db = admin.firestore();

(async () => {
  const uids = new Set();
  let token;
  do {
    const page = await admin.auth().listUsers(1000, token);
    page.users.forEach((u) => uids.add(u.uid));
    token = page.pageToken;
  } while (token);

  for (const col of ['reports', 'comparisons']) {
    const snap = await db.collection(col).get();
    let missing = 0, anonymous = 0, unknownUser = 0;
    snap.forEach((d) => {
      const u = d.get('userId');
      if (typeof u !== 'string' || !u) missing++;
      else if (u === 'anonymous') anonymous++;
      else if (!uids.has(u)) unknownUser++;
    });
    console.log(`${col}: gesamt=${snap.size} ohneUserId=${missing} anonymous=${anonymous} userIdOhneAuthKonto=${unknownUser}`);
  }

  const users = await db.collection('users').get();
  let orphan = 0;
  users.forEach((d) => { if (!uids.has(d.id)) orphan++; });
  console.log(`users: gesamt=${users.size} ohneAuthKonto=${orphan}; Auth-Konten=${uids.size}`);
  process.exit(0);
})().catch((e) => { console.error('Fehler:', e.message); process.exit(1); });
