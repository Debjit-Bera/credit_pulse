import React from 'react';
import { ArrowRight } from 'lucide-react';
import { calculateCreditScore, formatCurrency } from '../lib/creditEngine';
import type {
  ChatMessage,
  CreditAssessment,
  EmiCalculation,
  FinancialProfile,
  ImprovementPlan,
  LoanRejectionAnalysis,
  LoanSuggestion,
  NavSection,
} from '../types/creditpulse';

interface DashboardOverviewProps {
  profile: FinancialProfile | null;
  assessments: CreditAssessment[];
  analyses: LoanRejectionAnalysis[];
  plans: ImprovementPlan[];
  suggestions: LoanSuggestion[];
  emiCalculations: EmiCalculation[];
  chatMessages: ChatMessage[];
  onNavigate: (section: NavSection) => void;
}

function formatDate(ts?: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return 'Just now';
  return ts.toDate().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function DashboardOverview({
  profile,
  assessments,
  analyses,
  plans,
  suggestions,
  emiCalculations,
  chatMessages,
  onNavigate,
}: DashboardOverviewProps) {
  const computed = profile ? calculateCreditScore(profile) : null;
  const latestAssessment = assessments[0] ?? null;
  const displayScore = latestAssessment?.score ?? computed?.score ?? null;
  const displayBand = latestAssessment?.band ?? computed?.band ?? 'Unassessed';
  const latestAnalysis = analyses[0] ?? null;
  const activePlan = plans[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome back, {profile?.fullName || 'Member'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {profile?.email || 'Your Firestore credit intelligence overview'} ·{' '}
            <span className="capitalize">{profile?.employmentType.replace('_', ' ') || 'Profile pending'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap shrink-0"
        >
          Update Financial Profile
        </button>
      </div>

      {/* Key Financial Health KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {latestAssessment ? 'Latest Saved Credit Score' : 'Profile Score Estimate'}
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono-tabular text-3xl font-bold text-slate-900 dark:text-slate-100">
              {displayScore ?? '—'}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {displayBand}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('credit-score')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Open Smart Credit Score</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Financial Health Overview</div>
          <div className="mt-2 font-mono-tabular text-xl font-bold text-slate-900 dark:text-slate-100">
            {computed ? `${computed.utilizationRatio}% Util · ${computed.dtiRatio}% DTI` : '—'}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            Monthly Surplus: {computed ? formatCurrency(computed.monthlySurplus) : '—'}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('loan-analysis')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Run 7-Check Loan Diagnostic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">3-Month Improvement Progress</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-tabular text-3xl font-bold text-slate-900 dark:text-slate-100">
              {activePlan ? `${activePlan.progressPercent}%` : '0%'}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              {activePlan
                ? `${activePlan.completedTaskIds.length}/${activePlan.totalTasks} tasks`
                : 'Not started'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('improvement-plan')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Manage 90-Day Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Latest Loan Diagnostic</div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-slate-100">
            {latestAnalysis ? `${latestAnalysis.approvalOdds}% Odds` : 'No runs yet'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {latestAnalysis
              ? `${latestAnalysis.loanType} · ${latestAnalysis.passedChecksCount}/7 checks`
              : `${suggestions.length} saved loan suggestion(s)`}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('alternative-loans')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Explore Alternative Loans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Previous Assessments & Loan Analysis History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Previous Credit Assessments
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('credit-score')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View all ({assessments.length})
            </button>
          </div>
          {assessments.length === 0 ? (
            <div className="p-6 text-xs text-slate-500 dark:text-slate-400">
              No saved credit score snapshots yet. Open Smart Credit Score to save your first assessment.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {assessments.slice(0, 4).map((a) => (
                <div key={a.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Score {a.score} · {a.band}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Util {a.utilizationRatio}% · DTI {a.dtiRatio}%
                    </div>
                  </div>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Loan Analysis History
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('loan-analysis')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View all ({analyses.length})
            </button>
          </div>
          {analyses.length === 0 ? (
            <div className="p-6 text-xs text-slate-500 dark:text-slate-400">
              No loan diagnostics saved yet. Run the 7-check Loan Rejection Analysis to log a report.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {analyses.slice(0, 4).map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.loanType} · {formatCurrency(item.requestedAmount)}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.passedChecksCount}/7 checks · {item.approvalOdds}% odds · {item.riskLevel}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved EMI Calculations & AI Chat History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Saved EMI Calculations
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('emi-calculator')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Calculator ({emiCalculations.length})
            </button>
          </div>
          {emiCalculations.length === 0 ? (
            <div className="p-6 text-xs text-slate-500 dark:text-slate-400">
              No EMI scenarios saved yet. Open EMI Calculator to save a repayment breakdown.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {emiCalculations.slice(0, 4).map((calc) => (
                <div key={calc.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{calc.label}</div>
                    <div className="font-mono-tabular text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatCurrency(calc.principal)} @ {calc.annualInterestRate}% · {calc.tenureMonths}m
                    </div>
                  </div>
                  <div className="font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(calc.monthlyEmi)}/mo
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent AI Chat History
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('ai-assistant')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Open Assistant ({chatMessages.length})
            </button>
          </div>
          {chatMessages.length === 0 ? (
            <div className="p-6 text-xs text-slate-500 dark:text-slate-400">
              No AI chat messages yet. Ask CreditPulse AI a question grounded in your profile.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {chatMessages.slice(-4).map((msg) => (
                <div key={msg.id} className="px-6 py-3 space-y-0.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {msg.role === 'user' ? 'You' : 'CreditPulse AI'}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
