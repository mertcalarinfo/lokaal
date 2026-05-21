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

  await db.collection('reports').doc(report.id).set(reportData);
};

export const getUserReports = async (userId: string): Promise<AnalysisReport[]> => {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const snapshot = await db
      .collection('reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      } as AnalysisReport;
    });
  } catch (error: any) {
    console.warn('Failed to get user reports:', error.message);
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
    const snapshot = await db
      .collection('reports')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<', endDate)
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      } as AnalysisReport;
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
