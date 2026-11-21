import type { Timestamp } from 'firebase/firestore';

export type EmploymentType =
  | 'salaried'
  | 'self_employed'
  | 'freelancer'
  | 'business_owner'
  | 'student';

export type CreditBand = 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';

export type LoanRiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk';

export type DocumentCategory =
  | 'Income Proof'
  | 'Bank Statement'
  | 'Credit Report'
  | 'Loan Offer'
  | 'Other';

export type NavSection =
  | 'dashboard'
  | 'credit-score'
  | 'loan-analysis'
  | 'improvement-plan'
  | 'alternative-loans'
  | 'emi-calculator'
  | 'ai-assistant'
  | 'documents'
  | 'profile';

export interface UserAccount {
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FinancialProfile {
  userId: string;
  fullName: string;
  email: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingEmis: number;
  totalCreditLimit: number;
  creditCardBalance: number;
  creditAgeMonths: number;
  missedPayments12m: number;
  hardInquiries6m: number;
  employmentType: EmploymentType;
  employmentTenureMonths: number;
  requestedLoanAmount: number;
  requestedTenureMonths: number;
  loanPurpose: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CreditAssessment {
  id: string;
  userId: string;
  score: number;
  band: CreditBand;
  utilizationRatio: number;
  dtiRatio: number;
  paymentHistoryScore: number;
  creditMixScore: number;
  summary: string;
  createdAt?: Timestamp | null;
}

export interface LoanCheckDetail {
  key: string;
  title: string;
  passed: boolean;
  actualValue: string;
  targetThreshold: string;
  explanation: string;
  impactWeight: number;
}

export interface LoanRejectionAnalysis {
  id: string;
  userId: string;
  loanType: string;
  requestedAmount: number;
  requestedTenureMonths: number;
  approvalOdds: number;
  riskLevel: LoanRiskLevel;
  passedChecksCount: number;
  scoreUsed: number;
  dtiPercent: number;
  utilizationPercent: number;
  failedCheckKeys: string[];
  recommendations: string[];
  createdAt?: Timestamp | null;
}

export interface RoadmapTask {
  id: string;
  month: 1 | 2 | 3;
  title: string;
  detail: string;
  estimatedPointImpact: string;
}

export interface ImprovementPlan {
  id: string;
  userId: string;
  title: string;
  baselineScore: number;
  targetScore: number;
  completedTaskIds: string[];
  totalTasks: number;
  progressPercent: number;
  month1Focus: string;
  month2Focus: string;
  month3Focus: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AlternativeLoanOption {
  id: string;
  category: string;
  lenderType: string;
  eligibleAmount: number;
  estimatedApr: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalRepayment: number;
  approvalLikelihood: string;
  rationale: string;
}

export interface LoanSuggestion {
  id: string;
  userId: string;
  requestedAmount: number;
  tenureMonths: number;
  creditScoreUsed: number;
  recommendedCategory: string;
  estimatedApr: number;
  estimatedMonthlyEmi: number;
  totalRepayment: number;
  notes: string;
  createdAt?: Timestamp | null;
}

export interface EmiCalculation {
  id: string;
  userId: string;
  label: string;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayable: number;
  createdAt?: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  contextScore: number;
  createdAt?: Timestamp | null;
}

export interface UploadedDocument {
  id: string;
  userId: string;
  fileName: string;
  category: DocumentCategory;
  sizeBytes: number;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  storageBackend?: 'firebase-storage' | 'firestore-vault';
  chunkCount?: number;
  uploadStatus?: 'uploading' | 'ready';
  createdAt?: Timestamp | null;
}
