import React, { useState } from 'react';
import { BookmarkPlus, CheckCircle2, Trash2 } from 'lucide-react';
import {
  calculateCreditScore,
  formatCurrency,
  generateAlternativeLoanOptions,
} from '../lib/creditEngine';
import { deleteLoanSuggestion, saveLoanSuggestion } from '../lib/firestoreService';
import type {
  AlternativeLoanOption,
  FinancialProfile,
  LoanSuggestion,
  NavSection,
} from '../types/creditpulse';

interface AlternativeLoansViewProps {
  uid: string;
  profile: FinancialProfile | null;
  latestScore: number | null;
  savedSuggestions: LoanSuggestion[];
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

export function AlternativeLoansView({
  uid,
  profile,
  latestScore,
  savedSuggestions,
  onNavigate,
}: AlternativeLoansViewProps) {
  const [requestedAmount, setRequestedAmount] = useState(profile?.requestedLoanAmount ?? 500000);
  const [tenureMonths, setTenureMonths] = useState(profile?.requestedTenureMonths ?? 36);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          Saved Financial Profile Required
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Complete your saved profile to generate personalised alternative loan options and repayment estimates.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
        >
          Open Financial Profile
        </button>
      </div>
    );
  }

  const activeScore = latestScore ?? calculateCreditScore(profile).score;
  const options = generateAlternativeLoanOptions(profile, activeScore, requestedAmount, tenureMonths);

  async function handleSaveOption(opt: AlternativeLoanOption) {
    setSavingId(opt.id);
    setNotice(null);
    setError(null);
    try {
      await saveLoanSuggestion(uid, {
        requestedAmount: opt.eligibleAmount,
        tenureMonths: opt.tenureMonths,
        creditScoreUsed: activeScore,
        recommendedCategory: opt.category,
        estimatedApr: opt.estimatedApr,
        estimatedMonthlyEmi: opt.monthlyEmi,
        totalRepayment: opt.totalRepayment,
        notes: `${opt.lenderType} · ${opt.approvalLikelihood}. ${opt.rationale}`,
      });
      setNotice(`Saved "${opt.category}" repayment estimate to Firestore.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save loan suggestion.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteLoanSuggestion(uid, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete saved suggestion.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Alternative Loan Suggestions
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Personalised lending structures matched to your score ({activeScore}) and monthly affordability.
        </p>
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Target Principal (INR)
          </label>
          <input
            type="number"
            min={10000}
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Preferred Tenure (Months)
          </label>
          <input
            type="number"
            min={6}
            max={240}
            value={tenureMonths}
            onChange={(e) => setTenureMonths(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
          Profile Income: {formatCurrency(profile.monthlyIncome)}/mo · Existing EMIs: {formatCurrency(profile.existingEmis)}/mo
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {options.map((opt) => (
          <div
            key={opt.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{opt.lenderType}</div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {opt.category}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {opt.approvalLikelihood}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{opt.rationale}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Eligible</div>
                  <div className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(opt.eligibleAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Est. APR</div>
                  <div className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {opt.estimatedApr}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Monthly EMI</div>
                  <div className="font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(opt.monthlyEmi)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Total Repay</div>
                  <div className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(opt.totalRepayment)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                Tenure: {opt.tenureMonths} mos · Interest: {formatCurrency(opt.totalInterest)}
              </span>
              <button
                type="button"
                disabled={savingId === opt.id}
                onClick={() => handleSaveOption(opt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg whitespace-nowrap"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{savingId === opt.id ? 'Saving...' : 'Save Option'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Saved Alternative Loan Shortlist
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {savedSuggestions.length} saved
          </span>
        </div>

        {savedSuggestions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No alternative loan options saved yet. Click &ldquo;Save Option&rdquo; on any card above to bookmark it.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">APR</th>
                  <th className="py-3 px-4 text-right">Est. EMI</th>
                  <th className="py-3 px-4 text-right">Total Repayment</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {savedSuggestions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {item.recommendedCategory}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.requestedAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {item.estimatedApr}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.estimatedMonthlyEmi)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.totalRepayment)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete saved loan suggestion"
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
