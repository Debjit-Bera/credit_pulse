import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import type {
  ChatMessage,
  CreditAssessment,
  DocumentCategory,
  EmiCalculation,
  FinancialProfile,
  ImprovementPlan,
  LoanRejectionAnalysis,
  LoanSuggestion,
  UploadedDocument,
  UserAccount,
} from '../types/creditpulse';
import {
  auth,
  db,
  firebaseConfig,
  formatStorageError,
  handleFirestoreError,
  OperationType,
  storage,
} from './firebase';

function makeDefaultFinancialProfile(user: User): Omit<FinancialProfile, 'createdAt' | 'updatedAt'> {
  return {
    userId: user.uid,
    fullName: (user.displayName || user.email?.split('@')[0] || 'CreditPulse Member').slice(0, 120),
    email: (user.email || 'member@creditpulse.app').slice(0, 200),
    monthlyIncome: 85000,
    monthlyExpenses: 32000,
    existingEmis: 12000,
    totalCreditLimit: 200000,
    creditCardBalance: 42000,
    creditAgeMonths: 38,
    missedPayments12m: 0,
    hardInquiries6m: 1,
    employmentType: 'salaried',
    employmentTenureMonths: 28,
    requestedLoanAmount: 500000,
    requestedTenureMonths: 36,
    loanPurpose: 'Personal Consolidation',
  };
}

export async function ensureUserAccountAndProfile(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const userRef = doc(db, 'users', user.uid);
  const profileRef = doc(db, 'users', user.uid, 'private', 'financial_profile');

  let userSnap;
  let profileSnap;
  try {
    [userSnap, profileSnap] = await Promise.all([getDoc(userRef), getDoc(profileRef)]);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }

  if (userSnap.exists() && profileSnap.exists()) {
    return;
  }

  try {
    const batch = writeBatch(db);
    if (!userSnap.exists()) {
      const accountPayload: Record<string, unknown> = {
        uid: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'CreditPulse Member').slice(0, 100),
        photoURL: (user.photoURL || '').slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      batch.set(userRef, accountPayload);
    }
    if (!profileSnap.exists()) {
      const defaults = makeDefaultFinancialProfile(user);
      batch.set(profileRef, {
        ...defaults,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/private/financial_profile`);
  }
}

export function subscribeUserAccount(
  uid: string,
  onData: (account: UserAccount | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserAccount) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeFinancialProfile(
  uid: string,
  onData: (profile: FinancialProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}/private/financial_profile`;
  return onSnapshot(
    doc(db, 'users', uid, 'private', 'financial_profile'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as FinancialProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveFinancialProfile(
  uid: string,
  input: Omit<FinancialProfile, 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const path = `users/${uid}/private/financial_profile`;
  const profileRef = doc(db, 'users', uid, 'private', 'financial_profile');
  const userRef = doc(db, 'users', uid);

  const sanitized = {
    userId: uid,
    fullName: input.fullName.trim().slice(0, 120) || 'CreditPulse Member',
    email: input.email.trim().slice(0, 200) || 'member@creditpulse.app',
    monthlyIncome: Math.max(0, Number(input.monthlyIncome) || 0),
    monthlyExpenses: Math.max(0, Number(input.monthlyExpenses) || 0),
    existingEmis: Math.max(0, Number(input.existingEmis) || 0),
    totalCreditLimit: Math.max(0, Number(input.totalCreditLimit) || 0),
    creditCardBalance: Math.max(0, Number(input.creditCardBalance) || 0),
    creditAgeMonths: Math.max(0, Math.round(Number(input.creditAgeMonths) || 0)),
    missedPayments12m: Math.max(0, Math.round(Number(input.missedPayments12m) || 0)),
    hardInquiries6m: Math.max(0, Math.round(Number(input.hardInquiries6m) || 0)),
    employmentType: input.employmentType,
    employmentTenureMonths: Math.max(0, Math.round(Number(input.employmentTenureMonths) || 0)),
    requestedLoanAmount: Math.max(0, Number(input.requestedLoanAmount) || 0),
    requestedTenureMonths: Math.max(1, Math.min(480, Math.round(Number(input.requestedTenureMonths) || 12))),
    loanPurpose: input.loanPurpose.trim().slice(0, 80) || 'Personal Loan',
  };

  try {
    const existingSnap = await getDoc(profileRef);
    if (existingSnap.exists()) {
      await updateDoc(profileRef, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(userRef, {
        displayName: sanitized.fullName.slice(0, 100),
        updatedAt: serverTimestamp(),
      });
    } else {
      const batch = writeBatch(db);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        batch.set(userRef, {
          uid,
          displayName: sanitized.fullName.slice(0, 100),
          photoURL: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(profileRef, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserCollection<T extends { id: string }>(
  uid: string,
  collectionName: string,
  maxItems: number,
  onData: (items: T[]) => void,
  ascending = false
): Unsubscribe {
  const path = `users/${uid}/${collectionName}`;
  const q = query(
    collection(db, 'users', uid, collectionName),
    where('userId', '==', uid),
    orderBy('createdAt', ascending ? 'asc' : 'desc'),
    limit(maxItems)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<T, 'id'>),
        id: d.id,
      })) as T[];
      onData(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// 1. Smart Credit Score Assessments
export async function saveCreditAssessment(
  uid: string,
  data: Omit<CreditAssessment, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const path = `users/${uid}/creditAssessments`;
  try {
    const refDoc = await addDoc(collection(db, 'users', uid, 'creditAssessments'), {
      userId: uid,
      score: Math.min(900, Math.max(300, Math.round(data.score))),
      band: data.band,
      utilizationRatio: Number(data.utilizationRatio.toFixed(1)),
      dtiRatio: Number(data.dtiRatio.toFixed(1)),
      paymentHistoryScore: Math.min(100, Math.max(0, Math.round(data.paymentHistoryScore))),
      creditMixScore: Math.min(100, Math.max(0, Math.round(data.creditMixScore))),
      summary: data.summary.slice(0, 1000),
      createdAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCreditAssessment(uid: string, assessmentId: string): Promise<void> {
  const path = `users/${uid}/creditAssessments/${assessmentId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'creditAssessments', assessmentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 2. Loan Rejection Analyses
export async function saveLoanRejectionAnalysis(
  uid: string,
  data: Omit<LoanRejectionAnalysis, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const path = `users/${uid}/loanAnalyses`;
  try {
    const refDoc = await addDoc(collection(db, 'users', uid, 'loanAnalyses'), {
      userId: uid,
      loanType: data.loanType.slice(0, 60),
      requestedAmount: Math.max(0, Number(data.requestedAmount)),
      requestedTenureMonths: Math.max(1, Math.min(480, Math.round(data.requestedTenureMonths))),
      approvalOdds: Math.min(100, Math.max(0, Math.round(data.approvalOdds))),
      riskLevel: data.riskLevel,
      passedChecksCount: Math.min(7, Math.max(0, Math.round(data.passedChecksCount))),
      scoreUsed: Math.min(900, Math.max(300, Math.round(data.scoreUsed))),
      dtiPercent: Number(data.dtiPercent.toFixed(1)),
      utilizationPercent: Number(data.utilizationPercent.toFixed(1)),
      failedCheckKeys: data.failedCheckKeys.slice(0, 7).map((k) => k.slice(0, 180)),
      recommendations: data.recommendations.slice(0, 10).map((r) => r.slice(0, 195)),
      createdAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteLoanAnalysis(uid: string, analysisId: string): Promise<void> {
  const path = `users/${uid}/loanAnalyses/${analysisId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'loanAnalyses', analysisId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Three-Month Improvement Plans
export async function createOrResetImprovementPlan(
  uid: string,
  data: Omit<ImprovementPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const planId = 'active_roadmap';
  const path = `users/${uid}/improvementPlans/${planId}`;
  const planRef = doc(db, 'users', uid, 'improvementPlans', planId);
  try {
    await setDoc(planRef, {
      userId: uid,
      title: data.title.slice(0, 120),
      baselineScore: Math.min(900, Math.max(300, Math.round(data.baselineScore))),
      targetScore: Math.min(900, Math.max(300, Math.round(data.targetScore))),
      completedTaskIds: data.completedTaskIds.slice(0, 18),
      totalTasks: Math.min(18, Math.max(1, Math.round(data.totalTasks))),
      progressPercent: Math.min(100, Math.max(0, Math.round(data.progressPercent))),
      month1Focus: data.month1Focus.slice(0, 300),
      month2Focus: data.month2Focus.slice(0, 300),
      month3Focus: data.month3Focus.slice(0, 300),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateImprovementPlanProgress(
  uid: string,
  planId: string,
  completedTaskIds: string[],
  totalTasks: number,
  targetScore: number
): Promise<void> {
  const path = `users/${uid}/improvementPlans/${planId}`;
  const boundedIds = completedTaskIds.slice(0, 18).map((id) => id.slice(0, 80));
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((boundedIds.length / Math.max(1, totalTasks)) * 100))
  );
  try {
    await updateDoc(doc(db, 'users', uid, 'improvementPlans', planId), {
      completedTaskIds: boundedIds,
      progressPercent,
      targetScore: Math.min(900, Math.max(300, Math.round(targetScore))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteImprovementPlan(uid: string, planId: string): Promise<void> {
  const path = `users/${uid}/improvementPlans/${planId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'improvementPlans', planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 4. Alternative Loan Suggestions
export async function saveLoanSuggestion(
  uid: string,
  data: Omit<LoanSuggestion, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const path = `users/${uid}/loanSuggestions`;
  try {
    const refDoc = await addDoc(collection(db, 'users', uid, 'loanSuggestions'), {
      userId: uid,
      requestedAmount: Math.max(1, Number(data.requestedAmount)),
      tenureMonths: Math.max(1, Math.min(480, Math.round(data.tenureMonths))),
      creditScoreUsed: Math.min(900, Math.max(300, Math.round(data.creditScoreUsed))),
      recommendedCategory: data.recommendedCategory.slice(0, 100),
      estimatedApr: Number(data.estimatedApr.toFixed(2)),
      estimatedMonthlyEmi: Math.round(data.estimatedMonthlyEmi),
      totalRepayment: Math.round(data.totalRepayment),
      notes: data.notes.slice(0, 1000),
      createdAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteLoanSuggestion(uid: string, suggestionId: string): Promise<void> {
  const path = `users/${uid}/loanSuggestions/${suggestionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'loanSuggestions', suggestionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 5. EMI Calculations
export async function saveEmiCalculation(
  uid: string,
  data: Omit<EmiCalculation, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const path = `users/${uid}/emiCalculations`;
  try {
    const refDoc = await addDoc(collection(db, 'users', uid, 'emiCalculations'), {
      userId: uid,
      label: data.label.trim().slice(0, 100) || 'Loan EMI Plan',
      principal: Math.max(1, Number(data.principal)),
      annualInterestRate: Math.max(0, Number(data.annualInterestRate)),
      tenureMonths: Math.max(1, Math.min(480, Math.round(data.tenureMonths))),
      monthlyEmi: Math.round(data.monthlyEmi),
      totalInterest: Math.round(data.totalInterest),
      totalPayable: Math.round(data.totalPayable),
      createdAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEmiLabel(uid: string, calcId: string, label: string): Promise<void> {
  const path = `users/${uid}/emiCalculations/${calcId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'emiCalculations', calcId), {
      label: label.trim().slice(0, 100) || 'Loan EMI Plan',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEmiCalculation(uid: string, calcId: string): Promise<void> {
  const path = `users/${uid}/emiCalculations/${calcId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'emiCalculations', calcId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 6. AI Chat History
export async function saveChatMessage(
  uid: string,
  role: 'user' | 'assistant',
  content: string,
  contextScore: number
): Promise<string> {
  const path = `users/${uid}/chatMessages`;
  try {
    const refDoc = await addDoc(collection(db, 'users', uid, 'chatMessages'), {
      userId: uid,
      role,
      content: content.slice(0, 8000),
      contextScore: Math.min(900, Math.max(300, Math.round(contextScore))),
      createdAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteChatMessage(uid: string, messageId: string): Promise<void> {
  const path = `users/${uid}/chatMessages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'chatMessages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 7. Firebase Storage + Firestore Vault Document Management
export interface UploadProgressInfo {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadController {
  cancel: () => void;
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const FIRESTORE_CHUNK_BYTES = 384 * 1024; // 384 KB binary -> ~512 KB base64 (safely below 1 MB doc limit)
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/csv',
  'application/vnd.ms-excel',
]);

export function resolveDocumentContentType(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf') || file.type === 'application/pdf') return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || file.type === 'image/jpeg') {
    return 'image/jpeg';
  }
  if (lower.endsWith('.png') || file.type === 'image/png') return 'image/png';
  if (
    lower.endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel'
  ) {
    return 'text/csv';
  }
  return ALLOWED_MIME_TYPES.has(file.type) ? file.type : null;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const blockSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += blockSize) {
    const slice = bytes.subarray(i, i + blockSize);
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function isCloudStorageBucketActive(): Promise<boolean> {
  const bucket = firebaseConfig.storageBucket;
  if (!bucket) return false;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);
  try {
    const resp = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o`,
      { method: 'GET', signal: controller.signal }
    );
    return resp.status !== 404;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

async function uploadToFirebaseStorage(
  uid: string,
  file: File,
  category: DocumentCategory,
  contentType: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onCancelHandle?: (controller: UploadController) => void
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140) || 'document';
  const storagePath = `users/${uid}/documents/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType });
    onCancelHandle?.({ cancel: () => task.cancel() });

    let lastBytes = -1;
    const stallTimer = window.setInterval(() => {
      if (lastBytes <= 0 && task.snapshot.bytesTransferred === 0) {
        window.clearInterval(stallTimer);
        task.cancel();
        reject(new Error('Cloud Storage upload stalled at 0%.'));
      }
    }, 15000);

    task.on(
      'state_changed',
      (snapshot) => {
        lastBytes = snapshot.bytesTransferred;
        const total = Math.max(1, snapshot.totalBytes || file.size);
        const pct = Math.min(100, Math.round((snapshot.bytesTransferred / total) * 100));
        onProgress?.({
          percent: pct,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: total,
        });
      },
      (err) => {
        window.clearInterval(stallTimer);
        reject(new Error(formatStorageError(err)));
      },
      async () => {
        window.clearInterval(stallTimer);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(new Error(formatStorageError(err)));
        }
      }
    );
  });

  const path = `users/${uid}/documents`;
  try {
    const refDoc = await addDoc(collection(db, 'users', uid, 'documents'), {
      userId: uid,
      fileName: file.name.slice(0, 180),
      category,
      sizeBytes: Math.max(1, Math.round(file.size)),
      contentType: contentType.slice(0, 100),
      storagePath: storagePath.slice(0, 300),
      downloadUrl: downloadUrl.slice(0, 1000),
      storageBackend: 'firebase-storage',
      chunkCount: 0,
      uploadStatus: 'ready',
      createdAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (error) {
    await deleteObject(storageRef).catch(() => {});
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

async function uploadToFirestoreVault(
  uid: string,
  file: File,
  category: DocumentCategory,
  contentType: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onCancelHandle?: (controller: UploadController) => void
): Promise<string> {
  let canceled = false;
  onCancelHandle?.({
    cancel: () => {
      canceled = true;
    },
  });

  const arrayBuffer = await file.arrayBuffer();
  const totalBytes = Math.max(1, arrayBuffer.byteLength);
  const allBytes = new Uint8Array(arrayBuffer);
  const totalChunks = Math.max(1, Math.ceil(allBytes.length / FIRESTORE_CHUNK_BYTES));

  const docRef = doc(collection(db, 'users', uid, 'documents'));
  const docId = docRef.id;
  const storagePath = `firestore-vault://users/${uid}/documents/${docId}`;
  const downloadUrl = `firestore-vault://${docId}`;

  try {
    await setDoc(docRef, {
      userId: uid,
      fileName: file.name.slice(0, 180),
      category,
      sizeBytes: Math.max(1, Math.round(file.size)),
      contentType: contentType.slice(0, 100),
      storagePath: storagePath.slice(0, 300),
      downloadUrl: downloadUrl.slice(0, 1000),
      storageBackend: 'firestore-vault',
      chunkCount: totalChunks,
      uploadStatus: 'uploading',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/documents/${docId}`);
  }

  let bytesTransferred = 0;
  try {
    for (let i = 0; i < totalChunks; i++) {
      if (canceled) {
        throw new Error('Upload was canceled.');
      }
      const start = i * FIRESTORE_CHUNK_BYTES;
      const end = Math.min(allBytes.length, start + FIRESTORE_CHUNK_BYTES);
      const chunkBytes = allBytes.subarray(start, end);
      const encoded = uint8ArrayToBase64(chunkBytes);

      await setDoc(doc(db, 'users', uid, 'documents', docId, 'chunks', `chunk_${i}`), {
        userId: uid,
        documentId: docId,
        chunkIndex: i,
        data: encoded,
        createdAt: serverTimestamp(),
      });

      bytesTransferred = end;
      onProgress?.({
        percent: Math.min(99, Math.round((bytesTransferred / totalBytes) * 100)),
        bytesTransferred,
        totalBytes,
      });
    }

    if (canceled) {
      throw new Error('Upload was canceled.');
    }

    await updateDoc(docRef, {
      uploadStatus: 'ready',
    });

    onProgress?.({
      percent: 100,
      bytesTransferred: totalBytes,
      totalBytes,
    });

    return docId;
  } catch (error) {
    // Clean up partial chunks and parent document on failure or cancellation.
    await cleanupFirestoreChunks(uid, docId).catch(() => {});
    await deleteDoc(docRef).catch(() => {});
    if (error instanceof Error && error.message === 'Upload was canceled.') {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/documents/${docId}/chunks`);
  }
}

async function cleanupFirestoreChunks(uid: string, docId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'documents', docId, 'chunks'),
      where('userId', '==', uid),
      where('documentId', '==', docId)
    )
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function uploadFinancialDocument(
  uid: string,
  file: File,
  category: DocumentCategory,
  onProgress?: (info: UploadProgressInfo) => void,
  onCancelHandle?: (controller: UploadController) => void
): Promise<{ id: string; backend: 'firebase-storage' | 'firestore-vault' }> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('You must be signed in to upload documents.');
  }
  if (file.size <= 0) {
    throw new Error('The selected file is empty (0 bytes). Choose a valid document.');
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Maximum allowed file size is 10 MB.');
  }

  const contentType = resolveDocumentContentType(file);
  if (!contentType) {
    throw new Error('Unsupported file format. Only PDF, JPG, PNG, and CSV files are allowed.');
  }

  const bucketActive = await isCloudStorageBucketActive();
  if (bucketActive) {
    const id = await uploadToFirebaseStorage(
      uid,
      file,
      category,
      contentType,
      onProgress,
      onCancelHandle
    );
    return { id, backend: 'firebase-storage' };
  }

  const id = await uploadToFirestoreVault(
    uid,
    file,
    category,
    contentType,
    onProgress,
    onCancelHandle
  );
  return { id, backend: 'firestore-vault' };
}

async function reconstructVaultBlob(uid: string, docRecord: UploadedDocument): Promise<Blob> {
  const path = `users/${uid}/documents/${docRecord.id}/chunks`;
  let snap;
  try {
    snap = await getDocs(
      query(
        collection(db, 'users', uid, 'documents', docRecord.id, 'chunks'),
        where('userId', '==', uid),
        where('documentId', '==', docRecord.id)
      )
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }

  if (snap.empty) {
    throw new Error('Document data chunks were not found in Firestore Vault.');
  }

  const chunks = snap.docs
    .map((d) => d.data() as { chunkIndex: number; data: string })
    .sort((a, b) => a.chunkIndex - b.chunkIndex);

  const decodedParts = chunks.map((chunk) => base64ToUint8Array(chunk.data));
  const totalLen = decodedParts.reduce((acc, part) => acc + part.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of decodedParts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return new Blob([merged], { type: docRecord.contentType });
}

export async function viewFinancialDocument(
  uid: string,
  docRecord: UploadedDocument
): Promise<void> {
  if (docRecord.storageBackend === 'firestore-vault' || docRecord.downloadUrl.startsWith('firestore-vault://')) {
    const blob = await reconstructVaultBlob(uid, docRecord);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return;
  }

  const link = document.createElement('a');
  link.href = docRecord.downloadUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadFinancialDocument(
  uid: string,
  docRecord: UploadedDocument
): Promise<void> {
  if (docRecord.storageBackend === 'firestore-vault' || docRecord.downloadUrl.startsWith('firestore-vault://')) {
    const blob = await reconstructVaultBlob(uid, docRecord);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = docRecord.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    return;
  }

  try {
    const response = await fetch(docRecord.downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = docRecord.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const sep = docRecord.downloadUrl.includes('?') ? '&' : '?';
    const url = `${docRecord.downloadUrl}${sep}response-content-disposition=${encodeURIComponent(
      `attachment; filename="${docRecord.fileName}"`
    )}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export async function deleteFinancialDocument(
  uid: string,
  docRecord: UploadedDocument
): Promise<void> {
  if (docRecord.storageBackend === 'firestore-vault' || docRecord.storagePath.startsWith('firestore-vault://')) {
    try {
      await cleanupFirestoreChunks(uid, docRecord.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}/documents/${docRecord.id}/chunks`);
    }
  } else {
    try {
      const storageRef = ref(storage, docRecord.storagePath);
      await deleteObject(storageRef).catch((err) => {
        const code = (err as { code?: string })?.code;
        if (code !== 'storage/object-not-found' && code !== 'storage/bucket-not-found') {
          throw err;
        }
      });
    } catch (error) {
      throw new Error(formatStorageError(error));
    }
  }

  const path = `users/${uid}/documents/${docRecord.id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'documents', docRecord.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
