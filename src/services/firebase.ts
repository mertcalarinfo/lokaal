import { Platform } from 'react-native';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  // Key aus google-services.json — identisch mit dem nativen Build
  apiKey: 'AIzaSyADE9biVaDxVHhBo9k8Sr0rSKuQi7zQCFc',
  authDomain: 'prezence-app-1.firebaseapp.com',
  projectId: 'prezence-app-1',
  storageBucket: 'prezence-app-1.firebasestorage.app',
  messagingSenderId: '870921496071',
  appId: '1:870921496071:web:d8212af82cf5b2554daca2',
  measurementId: 'G-2S0G9945X6',
};

let firebaseApp: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;
let isConfigured = false;

export const checkFirebaseConfigured = (): boolean => {
  return firebaseConfig.apiKey !== '' && !firebaseConfig.apiKey.startsWith('YOUR_');
};

const initializeFirebase = () => {
  try {
    const firebase = require('@react-native-firebase/app').default;

    // @react-native-firebase auto-initialises the [DEFAULT] app natively from
    // GoogleService-Info.plist (iOS) / google-services.json (Android). Do NOT
    // call initializeApp() with a JS/web config for the native default app —
    // that is an anti-pattern and can abort the app natively (SIGABRT) when the
    // native config is missing. Rely on the native app; degrade gracefully if
    // it is absent so the UI still boots.
    if (!firebase.apps.length) {
      console.warn('[Firebase] No native default app — check GoogleService-Info.plist bundling.');
      isConfigured = false;
      return;
    }

    firebaseApp = firebase.app();
    authInstance = require('@react-native-firebase/auth').default();
    dbInstance = require('@react-native-firebase/firestore').default();
    storageInstance = require('@react-native-firebase/storage').default();
    isConfigured = true;
  } catch (error) {
    console.warn('Firebase initialization error:', error);
    isConfigured = false;
  }
};

// Initialize on module load
initializeFirebase();

export { firebaseApp, authInstance as auth, dbInstance as db, storageInstance as storage, isConfigured };

export const getAuth = () => {
  if (!authInstance) {
    try {
      authInstance = require('@react-native-firebase/auth').default();
    } catch {
      return null;
    }
  }
  return authInstance;
};

export const getDb = () => {
  if (!dbInstance) {
    try {
      dbInstance = require('@react-native-firebase/firestore').default();
    } catch {
      return null;
    }
  }
  return dbInstance;
};

export const getStorage = () => {
  if (!storageInstance) {
    try {
      storageInstance = require('@react-native-firebase/storage').default();
    } catch {
      return null;
    }
  }
  return storageInstance;
};

export const FirestoreTimestamp = {
  now: () => {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      return firestore.Timestamp.now();
    } catch {
      return new Date();
    }
  },
  fromDate: (date: Date) => {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      return firestore.Timestamp.fromDate(date);
    } catch {
      return date;
    }
  },
};
