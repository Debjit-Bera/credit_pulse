import React, { useState } from 'react';
import { CheckCircle2, FileSearch, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import {
  calculateCreditScore,
  formatCurrency,
  runLoanRejectionChecks,
} from '../lib/creditEngine';
import { deleteLoanAnalysis, saveLoanRejectionAnalysis } from '../lib/firestoreService';
import type { FinancialProfile, LoanRejectionAnalysis, NavSection } from '../types/creditpulse';

interface LoanRejectionViewProps {
  uid: string;
  profile: FinancialProfile | null;
  latestScore: number | null;
  analyses: LoanRejectionAnalysis[];
  onNavigate: (section: NavSection) => void;
}

const LOAN_TYPES = ['Personal Loan', 'Home Loan', 'Auto Loan', 'Education Loan', 'Business Loan'];

function formatDate(ts?: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return 'Just now';
  return ts.toDate().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function LoanRejectionView({
  uid,
  profile,
  latestScore,
  analyses,
  onNavigate,
}: LoanRejectionViewProps) {
  const [loanType, setLoanType] = useState('Personal Loan');
  const [requestedAmount, setRequestedAmount] = useState(profile?.requestedLoanAmount ?? 500000);
  const [tenureMonths, setTenureMonths] = useState(profile?.requestedTenureMonths ?? 36);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          Saved Financial Profile Required
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Save your financial profile first so the 7-point loan underwriting diagnostic can inspect your DTI, utilization, and payment history.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
        >
          Complete Financial Profile
        </button>
      </div>
    );
  }

  const activeScore = latestScore ?? calculateCreditScore(profile).score;
  const diagnostic = runLoanRejectionChecks(
    profile,
    activeScore,
    loanType,
    requestedAmount,
    tenureMonths
  );

  async function handleSaveAnalysis() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await saveLoanRejectionAnalysis(uid, {
        loanType: diagnostic.loanType,
        requestedAmount: diagnostic.requestedAmount,
        requestedTenureMonths: diagnostic.requestedTenureMonths,
        approvalOdds: diagnostic.approvalOdds,
        riskLevel: diagnostic.riskLevel,
        passedChecksCount: diagnostic.passedChecksCount,
        scoreUsed: diagnostic.scoreUsed,
        dtiPercent: diagnostic.dtiPercent,
        utilizationPercent: diagnostic.utilizationPercent,
        failedCheckKeys: diagnostic.failedCheckKeys,
        recommendations: diagnostic.recommendations,
      });
      setNotice(`7-check diagnostic (${diagnostic.passedChecksCount}/7 passed · ${diagnostic.approvalOdds}% odds) saved to Firestore.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save analysis.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteLoanAnalysis(uid, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete analysis.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Loan Rejection Analysis
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            All seven underwriting checks evaluated against your saved financial profile and score ({activeScore}).
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveAnalysis}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0"
        >
          <FileSearch className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Diagnostic Report'}</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Loan Category
          </label>
          <select
            value={loanType}
            onChange={(e) => setLoanType(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          >
            {LOAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Requested Amount (INR)
          </label>
          <input
            type="number"
            min={5000}
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Tenure (Months)
          </label>
          <input
            type="number"
            min={6}
            max={360}
            value={tenureMonths}
            onChange={(e) => setTenureMonths(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Approval Odds · {diagnostic.riskLevel}
          </div>
          <div className="font-mono-tabular text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {diagnostic.approvalOdds}% · {diagnostic.passedChecksCount}/7 checks
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Seven Underwriting Checks
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              Est. New EMI: {formatCurrency(diagnostic.proposedMonthlyEmi)}/mo
            </span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {diagnostic.checks.map((check) => (
              <div key={check.key} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {check.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{check.explanation}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono-tabular text-xs">
                  <div
                    className={`font-semibold ${
                      check.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {check.actualValue}
                  </div>
                  <div className="text-slate-400 mt-0.5">Target {check.targetThreshold}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Personalised Recommendations
            </h2>
          </div>
          <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {diagnostic.recommendations.map((rec, idx) => (
              <li key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                {rec}
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onNavigate('improvement-plan')}
              className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            >
              Open 3-Month Improvement Roadmap
            </button>
            <button
              type="button"
              onClick={() => onNavigate('alternative-loans')}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Compare Alternative Loan Options
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Saved Loan Analysis History
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {analyses.length} record(s)
          </span>
        </div>

        {analyses.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No loan diagnostics saved yet. Click &ldquo;Save Diagnostic Report&rdquo; to store this analysis in Firestore.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Loan Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Checks</th>
                  <th className="py-3 px-4 text-right">Approval Odds</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {analyses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {item.loanType}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.requestedAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {item.passedChecksCount}/7
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                      {item.approvalOdds}%
                    </td>
                    <td
                      className={`py-3 px-4 font-semibold whitespace-nowrap ${
                        item.riskLevel === 'Low Risk'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.riskLevel === 'Moderate Risk'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.riskLevel}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete loan analysis"
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
