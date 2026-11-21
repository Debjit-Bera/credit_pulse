import React, { useState } from 'react';
import { Calculator, CheckCircle2, Trash2 } from 'lucide-react';
import { calculateCreditScore, formatCurrency } from '../lib/creditEngine';
import { deleteCreditAssessment, saveCreditAssessment } from '../lib/firestoreService';
import type { CreditAssessment, FinancialProfile, NavSection } from '../types/creditpulse';

interface SmartCreditScoreViewProps {
  uid: string;
  profile: FinancialProfile | null;
  assessments: CreditAssessment[];
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

export function SmartCreditScoreView({
  uid,
  profile,
  assessments,
  onNavigate,
}: SmartCreditScoreViewProps) {
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          Complete your Financial Profile first
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Save your income, card balances, and credit history once to calculate your Smart Credit Score.
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

  const computed = calculateCreditScore(profile);
  const scorePercent = Math.round(((computed.score - 300) / 600) * 100);

  async function handleSaveAssessment() {
    setSaving(true);
    setError(null);
    setSavedBanner(null);
    try {
      await saveCreditAssessment(uid, {
        score: computed.score,
        band: computed.band,
        utilizationRatio: computed.utilizationRatio,
        dtiRatio: computed.dtiRatio,
        paymentHistoryScore: computed.paymentHistoryScore,
        creditMixScore: computed.creditMixScore,
        summary: computed.summary,
      });
      setSavedBanner(`Assessment (${computed.score} · ${computed.band}) saved to Firestore history.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteCreditAssessment(uid, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assessment.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Smart Credit Score
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Calculated directly from your saved Financial Profile ({formatCurrency(profile.monthlyIncome)}/mo income ·{' '}
            {profile.creditAgeMonths}m credit age).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
          >
            Edit Profile Inputs
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAssessment}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg whitespace-nowrap"
          >
            <Calculator className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Assessment Snapshot'}</span>
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Estimated CreditPulse Score
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono-tabular text-5xl font-bold text-slate-900 dark:text-slate-100">
                {computed.score}
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {computed.band} · 300–900
              </span>
            </div>
          </div>

          <div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
              <span>300</span>
              <span>650</span>
              <span>750</span>
              <span>900</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-4">
            {computed.summary}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Card Utilization</div>
              <div className="font-mono-tabular text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {computed.utilizationRatio}%
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Current DTI Ratio</div>
              <div className="font-mono-tabular text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {computed.dtiRatio}%
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Five-Factor Score Breakdown
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {computed.factors.map((factor) => (
              <div key={factor.label} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {factor.label}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      · Weight {factor.weight}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{factor.detail}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`text-xs font-semibold ${
                      factor.status === 'Strong'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : factor.status === 'Moderate'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {factor.status}
                  </span>
                  <span className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-slate-100 w-14 text-right">
                    {factor.scoreOutOf100}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Saved Assessment History
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {assessments.length} record(s)
          </span>
        </div>

        {assessments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No credit assessments saved yet. Click &ldquo;Save Assessment Snapshot&rdquo; above to record your baseline in Firestore.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Band</th>
                  <th className="py-3 px-4 text-right">Utilization</th>
                  <th className="py-3 px-4 text-right">DTI</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {assessments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                      {item.score}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {item.band}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {item.utilizationRatio}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {item.dtiRatio}%
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-md truncate">
                      {item.summary}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete assessment"
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
