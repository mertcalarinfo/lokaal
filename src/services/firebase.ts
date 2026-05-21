import { Platform } from 'react-native';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

let firebaseApp: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;
let isConfigured = false;

const UNCONFIGURED_KEYS = [
  'YOUR_API_KEY',
  'YOUR_PROJECT.firebaseapp.com',
  'YOUR_PROJECT_ID',
  'YOUR_PROJECT.appspot.com',
  'YOUR_SENDER_ID',
  'YOUR_APP_ID',
];

export const checkFirebaseConfigured = (): boolean => {
  return !UNCONFIGURED_KEYS.includes(firebaseConfig.apiKey);
};

const initializeFirebase = () => {
  try {
    // Use @react-native-firebase which is auto-configured via native modules
    // For Expo bare workflow with google-services.json / GoogleService-Info.plist
    const firebase = require('@react-native-firebase/app').default;

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
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
