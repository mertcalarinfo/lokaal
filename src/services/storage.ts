import { AnalysisReport, SavedComparison } from '../types';
import { getDb, getStorage } from './firebase';

/**
 * Entfernt rekursiv alle `undefined`-Werte aus einem Objekt/Array.
 * Firestore wirft sonst "unsupported field value: undefined" beim Schreiben.
 * `null` und leere Strings bleiben erhalten.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

export const uploadVideo = async (
  uri: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const storage = getStorage();
  if (!storage) throw new Error('Firebase Storage not initialized');

  const fileName = `videos/${userId}/${Date.now()}_video.mp4`;
  const reference = storage.ref(fileName);
  const task = reference.putFile(uri);

  // Track progress via on() — completion is handled by awaiting the task directly,
  // because RN Firebase Tasks are thenables and the completion-callback variant of
  // on() has known timing issues (resolve() may never be called).
  if (onProgress) {
    task.on('state_changed', (snapshot: any) => {
      const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress(Math.round(pct));
    });
  }

  await task;
  return await reference.getDownloadURL();
};

export const uploadProfilePicture = async (
  uri: string,
  userId: string
): Promise<string> => {
  const storage = getStorage();
  if (!storage) throw new Error('Firebase Storage not initialized');

  // Fester Pfad pro Nutzer — neues Bild überschreibt das alte automatisch.
  const reference = storage.ref(`profilePictures/${userId}`);
  await reference.putFile(uri);
  return await reference.getDownloadURL();
};

export const saveReport = async (report: AnalysisReport): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const reportData = stripUndefined({
    ...report,
    createdAt: report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt),
  });

  console.log('[storage] Saving report', report.id, 'for userId:', report.userId);
  await db.collection('reports').doc(report.id).set(reportData);
  console.log('[storage] Report saved successfully:', report.id);
};

export const getUserReports = async (userId: string): Promise<AnalysisReport[]> => {
  const db = getDb();
  if (!db) {
    console.warn('[storage] getUserReports: Firestore not initialized');
    return [];
  }

  try {
    // IMPORTANT: query by userId only (a single-field, auto-created index).
    // Adding .orderBy('createdAt') here requires a COMPOSITE index that does
    // not exist by default — the query then throws FAILED_PRECONDITION and the
    // catch below silently returns [], which is why saved reports never showed
    // up in the Progress tab. Sort on the client instead.
    const snapshot = await db
      .collection('reports')
      .where('userId', '==', userId)
      .get();

    const reports = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      } as AnalysisReport;
    });

    // Newest first, sorted client-side.
    reports.sort(
      (a: AnalysisReport, b: AnalysisReport) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('[storage] getUserReports:', reports.length, 'reports for userId:', userId);
    return reports;
  } catch (error: any) {
    console.warn('[storage] Failed to get user reports:', error.message);
    return [];
  }
};

export const updateReportName = async (reportId: string, customName: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');
  await db.collection('reports').doc(reportId).update({ customName });
};

export const deleteReport = async (reportId: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  await db.collection('reports').doc(reportId).delete();
};

export const getReportsByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<AnalysisReport[]> => {
  const db = getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  try {
    // Same composite-index pitfall as getUserReports: query by userId only,
    // then filter the date range on the client.
    const snapshot = await db
      .collection('reports')
      .where('userId', '==', userId)
      .get();

    return snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as AnalysisReport;
      })
      .filter((r: AnalysisReport) => {
        const created = new Date(r.createdAt);
        return created >= startDate && created < endDate;
      });
  } catch (error: any) {
    console.warn('Failed to get reports by month:', error.message);
    return [];
  }
};

export const saveComparison = async (comparison: SavedComparison): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');
  const data = stripUndefined({
    ...comparison,
    createdAt: comparison.createdAt instanceof Date ? comparison.createdAt : new Date(comparison.createdAt),
  });
  await db.collection('comparisons').doc(comparison.id).set(data);
};

export const getUserComparisons = async (userId: string): Promise<SavedComparison[]> => {
  const db = getDb();
  if (!db) return [];
  try {
    const snapshot = await db.collection('comparisons').where('userId', '==', userId).get();
    const items = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      } as SavedComparison;
    });
    items.sort((a: SavedComparison, b: SavedComparison) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  } catch (error: any) {
    console.warn('[storage] Failed to get user comparisons:', error.message);
    return [];
  }
};

export const updateComparisonName = async (comparisonId: string, customName: string): Promise<void> => {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');
  await db.collection('comparisons').doc(comparisonId).update({ customName });
};

/** Aktueller Kalendermonat als "YYYY-MM" (lokale Zeit). */
export const currentUsageMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Zählt eine erfolgreich abgeschlossene Analyse für den aktuellen Monat hoch.
 * Reset passiert automatisch durch Monatsabgleich (kein Cron): stimmt der
 * gespeicherte usageMonth nicht mit dem aktuellen überein, startet der Zähler bei 1.
 * Gibt den neuen Monatszähler zurück.
 */
export const incrementMonthlyUsage = async (userId: string): Promise<number> => {
  const db = getDb();
  if (!db) return 0;
  const month = currentUsageMonth();
  const ref = db.collection('users').doc(userId);
  try {
    return await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const sameMonth = data?.usageMonth === month;
      const next = sameMonth ? (data?.usageCount ?? 0) + 1 : 1;
      tx.set(ref, { usageMonth: month, usageCount: next }, { merge: true });
      return next;
    });
  } catch (err: any) {
    console.warn('[storage] incrementMonthlyUsage failed:', err?.message);
    return 0;
  }
};

/** Liest den Analysen-Zähler des aktuellen Monats (0, wenn anderer Monat/keine Daten). */
export const getMonthlyUsage = async (userId: string): Promise<number> => {
  const db = getDb();
  if (!db) return 0;
  try {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) return 0;
    const data = snap.data();
    return data?.usageMonth === currentUsageMonth() ? (data?.usageCount ?? 0) : 0;
  } catch {
    return 0;
  }
};

export const saveUserProfile = async (
  userId: string,
  data: Record<string, any>
): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  await db.collection('users').doc(userId).set(data, { merge: true });
};

export const getUserProfile = async (userId: string): Promise<any | null> => {
  const db = getDb();
  if (!db) return null;

  try {
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.warn('Failed to get user profile:', error);
    return null;
  }
};
