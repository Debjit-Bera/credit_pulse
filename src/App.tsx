import React, { useEffect, useState } from 'react';
import {
  Bot,
  Calculator,
  CheckCircle2,
  Compass,
  FileSearch,
  FolderLock,
  Gauge,
  LayoutDashboard,
  LogOut,
  MailCheck,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  TrendingUp,
  UserCog,
  X,
} from 'lucide-react';
import { AiAssistantView } from './components/AiAssistantView';
import { AlternativeLoansView } from './components/AlternativeLoansView';
import { AuthView } from './components/AuthView';
import { DashboardOverview } from './components/DashboardOverview';
import { DocumentVaultView } from './components/DocumentVaultView';
import { EmiCalculatorView } from './components/EmiCalculatorView';
import { ImprovementRoadmapView } from './components/ImprovementRoadmapView';
import { LoanRejectionView } from './components/LoanRejectionView';
import { ProfileView } from './components/ProfileView';
import { SmartCreditScoreView } from './components/SmartCreditScoreView';
import { useAuth } from './context/AuthContext';
import {
  subscribeFinancialProfile,
  subscribeUserCollection,
} from './lib/firestoreService';
import type {
  ChatMessage,
  CreditAssessment,
  EmiCalculation,
  FinancialProfile,
  ImprovementPlan,
  LoanRejectionAnalysis,
  LoanSuggestion,
  NavSection,
  UploadedDocument,
} from './types/creditpulse';

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'credit-score', label: 'Smart Credit Score', icon: Gauge },
  { id: 'loan-analysis', label: 'Loan Diagnostics', icon: FileSearch },
  { id: 'improvement-plan', label: '3-Month Roadmap', icon: TrendingUp },
  { id: 'alternative-loans', label: 'Alternative Loans', icon: Compass },
  { id: 'emi-calculator', label: 'EMI Calculator', icon: Calculator },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { id: 'documents', label: 'Document Vault', icon: FolderLock },
  { id: 'profile', label: 'Financial Profile', icon: UserCog },
];

function EmailVerificationGate() {
  const { user, resendVerification, refreshUserSession, signInWithGoogle, logout } = useAuth();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const ok = await refreshUserSession();
      if (!ok) {
        setStatusMsg('Email is not verified yet. Open the verification link in your inbox and click Check Again.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to refresh verification status.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await resendVerification();
      setStatusMsg(`Verification link re-sent to ${user?.email}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to resend email.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-5">
        <div className="flex items-center gap-3">
          <MailCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Verify your email address
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          We sent a verification link to <strong className="text-slate-900 dark:text-slate-100">{user?.email}</strong>.
          Verified email ownership protects your private Firestore financial records.
        </p>

        {statusMsg && (
          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={checking}
            onClick={handleCheck}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{checking ? 'Checking...' : "I've Verified — Continue"}</span>
          </button>
          <button
            type="button"
            onClick={handleResend}
            className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
          >
            Resend Verification Email
          </button>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
          >
            Switch to Google Sign-In
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('creditpulse_theme') === 'dark';
  });

  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [assessments, setAssessments] = useState<CreditAssessment[]>([]);
  const [analyses, setAnalyses] = useState<LoanRejectionAnalysis[]>([]);
  const [plans, setPlans] = useState<ImprovementPlan[]>([]);
  const [suggestions, setSuggestions] = useState<LoanSuggestion[]>([]);
  const [emiCalculations, setEmiCalculations] = useState<EmiCalculation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('creditpulse_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('creditpulse_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setProfile(null);
      setAssessments([]);
      setAnalyses([]);
      setPlans([]);
      setSuggestions([]);
      setEmiCalculations([]);
      setChatMessages([]);
      setDocuments([]);
      return;
    }

    const uid = user.uid;
    const unsubs = [
      subscribeFinancialProfile(uid, setProfile),
      subscribeUserCollection<CreditAssessment>(uid, 'creditAssessments', 25, setAssessments),
      subscribeUserCollection<LoanRejectionAnalysis>(uid, 'loanAnalyses', 25, setAnalyses),
      subscribeUserCollection<ImprovementPlan>(uid, 'improvementPlans', 5, setPlans),
      subscribeUserCollection<LoanSuggestion>(uid, 'loanSuggestions', 25, setSuggestions),
      subscribeUserCollection<EmiCalculation>(uid, 'emiCalculations', 25, setEmiCalculations),
      subscribeUserCollection<ChatMessage>(uid, 'chatMessages', 50, setChatMessages, true),
      subscribeUserCollection<UploadedDocument>(uid, 'documents', 25, setDocuments),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading CreditPulse workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  if (!user.emailVerified) {
    return <EmailVerificationGate />;
  }

  const latestScore = assessments[0]?.score ?? null;
  const activeItem = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  function handleNavigate(next: NavSection) {
    setActiveSection(next);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            CreditPulse
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {profile?.fullName || user.displayName || 'Member'}
            </div>
            <div className="text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                CreditPulse
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="flex-1 py-2 px-3 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="flex-1 py-2 px-3 text-xs font-medium text-rose-600 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              CreditPulse <span aria-hidden="true">/</span>{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeItem.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('profile')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap shrink-0"
          >
            Saved Financial Profile
          </button>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8">
          {activeSection === 'dashboard' && (
            <DashboardOverview
              profile={profile}
              assessments={assessments}
              analyses={analyses}
              plans={plans}
              suggestions={suggestions}
              emiCalculations={emiCalculations}
              chatMessages={chatMessages}
              onNavigate={handleNavigate}
            />
          )}
          {activeSection === 'credit-score' && (
            <SmartCreditScoreView
              uid={user.uid}
              profile={profile}
              assessments={assessments}
              onNavigate={handleNavigate}
            />
          )}
          {activeSection === 'loan-analysis' && (
            <LoanRejectionView
              uid={user.uid}
              profile={profile}
              latestScore={latestScore}
              analyses={analyses}
              onNavigate={handleNavigate}
            />
          )}
          {activeSection === 'improvement-plan' && (
            <ImprovementRoadmapView
              uid={user.uid}
              profile={profile}
              latestScore={latestScore}
              plans={plans}
              onNavigate={handleNavigate}
            />
          )}
          {activeSection === 'alternative-loans' && (
            <AlternativeLoansView
              uid={user.uid}
              profile={profile}
              latestScore={latestScore}
              savedSuggestions={suggestions}
              onNavigate={handleNavigate}
            />
          )}
          {activeSection === 'emi-calculator' && (
            <EmiCalculatorView
              uid={user.uid}
              profile={profile}
              calculations={emiCalculations}
            />
          )}
          {activeSection === 'ai-assistant' && (
            <AiAssistantView
              uid={user.uid}
              profile={profile}
              latestScore={latestScore}
              latestAnalysis={analyses[0] ?? null}
              activePlan={plans[0] ?? null}
              messages={chatMessages}
            />
          )}
          {activeSection === 'documents' && (
            <DocumentVaultView uid={user.uid} documents={documents} />
          )}
          {activeSection === 'profile' && (
            <ProfileView
              uid={user.uid}
              userEmail={user.email || ''}
              profile={profile}
            />
          )}
        </main>
      </div>
    </div>
  );
}
