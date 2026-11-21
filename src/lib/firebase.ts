import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(
  app,
  firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined
);
storage.maxUploadRetryTime = 15000;
storage.maxOperationRetryTime = 15000;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to configure Firebase Auth persistence:', err);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<{ connected: boolean; detail: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true, detail: 'Firestore reachable' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return { connected: false, detail: 'Firestore client is offline. Check Firebase configuration.' };
    }
    // A permission-denied response from the server confirms active Firestore connectivity.
    return { connected: true, detail: 'Firestore server responded' };
  }
}

export function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : String(error);

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Double-check your credentials or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method). Use Google Sign-In or enable Email/Password in Firebase Console.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In popup was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console (Authentication -> Settings -> Authorized domains).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Authentication. Check your connection.';
    default:
      return message || 'Authentication failed. Please try again.';
  }
}

export function formatStorageError(error: unknown, bucketName = firebaseConfig.storageBucket): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : String(error);

  switch (code) {
    case 'storage/unauthorized':
      return `Permission denied by Firebase Storage Rules for bucket "${bucketName}". Ensure storage.rules are published and your email is verified.`;
    case 'storage/bucket-not-found':
    case 'storage/project-not-found':
      return `Firebase Storage bucket "${bucketName}" was not found. Open Firebase Console -> Storage -> Get Started to provision Cloud Storage for project "${firebaseConfig.projectId}".`;
    case 'storage/quota-exceeded':
      return 'Firebase Storage quota exceeded for this project. Check your Firebase billing/Spark plan usage.';
    case 'storage/canceled':
      return 'Upload was canceled.';
    case 'storage/retry-limit-exceeded':
      return `Upload timed out before completing. Check your connection and confirm Firebase Storage is initialized for "${bucketName}" with storage.rules deployed.`;
    case 'storage/unauthenticated':
      return 'Your sign-in session expired. Sign in again before uploading documents.';
    default:
      if (message.includes('404') || message.includes('Not Found')) {
        return `Firebase Storage bucket "${bucketName}" returned 404 Not Found. Enable Cloud Storage in Firebase Console (Storage -> Get Started) and publish storage.rules.`;
      }
      return message || 'Document upload failed. Please try again.';
  }
}

export { firebaseConfig };
