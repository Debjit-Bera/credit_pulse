import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, formatAuthError, googleProvider, testConnection } from '../lib/firebase';
import { ensureUserAccountAndProfile } from '../lib/firestoreService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firestoreReachable: boolean;
  connectionMessage: string;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUserSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreReachable, setFirestoreReachable] = useState(true);
  const [connectionMessage, setConnectionMessage] = useState('Checking Firestore connection...');

  useEffect(() => {
    testConnection().then((res) => {
      setFirestoreReachable(res.connected);
      setConnectionMessage(res.detail);
    });

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser && nextUser.emailVerified) {
        try {
          await ensureUserAccountAndProfile(nextUser);
        } catch (err) {
          console.error('Bootstrap profile failed:', err);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function signInWithEmail(email: string, password: string): Promise<void> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (cred.user.emailVerified) {
        await ensureUserAccountAndProfile(cred.user);
      }
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function signUpWithEmail(fullName: string, email: string, password: string): Promise<void> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      await sendEmailVerification(cred.user);
      setUser({ ...cred.user } as User);
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function signInWithGoogle(): Promise<void> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user.emailVerified) {
        await ensureUserAccountAndProfile(cred.user);
      }
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function resendVerification(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No active user session found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function refreshUserSession(): Promise<boolean> {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const reloaded = auth.currentUser;
    setUser(reloaded ? ({ ...reloaded } as User) : null);
    if (reloaded && reloaded.emailVerified) {
      await ensureUserAccountAndProfile(reloaded);
      return true;
    }
    return false;
  }

  async function logout(): Promise<void> {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        firestoreReachable,
        connectionMessage,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        resendVerification,
        refreshUserSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
