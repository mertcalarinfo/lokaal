import { AnalysisReport } from '../types';
import { getDb, getStorage } from './firebase';

export const uploadVideo = async (
  uri: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const storage = getStorage();
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  const fileName = `videos/${userId}/${Date.now()}_video.mp4`;
  const reference = storage.ref(fileName);

  return new Promise<string>((resolve, reject) => {
    const task = reference.putFile(uri);

    task.on(
      'state_changed',
      (snapshot: any) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(Math.round(progress));
      },
      (error: any) => {
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await reference.getDownloadURL();
          resolve(downloadURL);
        } catch (error: any) {
          reject(new Error(`Failed to get download URL: ${error.message}`));
        }
      }
    );
  });
};

export const saveReport = async (report: AnalysisReport): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const reportData = {
    ...report,
    createdAt: report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt),
  };

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
