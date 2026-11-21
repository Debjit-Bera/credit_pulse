import React, { useState } from 'react';
import { Check, CheckCircle2, Edit3, Save, Trash2, X } from 'lucide-react';
import { calculateEmi, formatCurrency } from '../lib/creditEngine';
import {
  deleteEmiCalculation,
  saveEmiCalculation,
  updateEmiLabel,
} from '../lib/firestoreService';
import type { EmiCalculation, FinancialProfile } from '../types/creditpulse';

interface EmiCalculatorViewProps {
  uid: string;
  profile: FinancialProfile | null;
  calculations: EmiCalculation[];
}

function formatDate(ts?: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return 'Just now';
  return ts.toDate().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function EmiCalculatorView({ uid, profile, calculations }: EmiCalculatorViewProps) {
  const [label, setLabel] = useState(profile?.loanPurpose || 'Personal Loan Scenario');
  const [principal, setPrincipal] = useState(profile?.requestedLoanAmount ?? 500000);
  const [annualRate, setAnnualRate] = useState(11.5);
  const [tenureMonths, setTenureMonths] = useState(profile?.requestedTenureMonths ?? 36);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const breakdown = calculateEmi(principal, annualRate, tenureMonths);
  const postLoanDti =
    profile && profile.monthlyIncome > 0
      ? Number((((profile.existingEmis + breakdown.monthlyEmi) / profile.monthlyIncome) * 100).toFixed(1))
      : null;

  async function handleSaveCalculation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await saveEmiCalculation(uid, {
        label,
        principal,
        annualInterestRate: annualRate,
        tenureMonths,
        monthlyEmi: breakdown.monthlyEmi,
        totalInterest: breakdown.totalInterest,
        totalPayable: breakdown.totalPayable,
      });
      setNotice(`Saved "${label}" (${formatCurrency(breakdown.monthlyEmi)}/mo) to Firestore.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save EMI calculation.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: string) {
    if (!editingLabel.trim()) return;
    setError(null);
    try {
      await updateEmiLabel(uid, id, editingLabel);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update label.');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteEmiCalculation(uid, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete calculation.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          EMI Calculator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Exact reducing-balance amortization pre-filled from your saved Financial Profile with DTI impact check.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveCalculation}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Scenario Label
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Loan Principal (INR)
            </label>
            <input
              type="number"
              min={1000}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Annual Interest Rate (% p.a.)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              step={0.1}
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Tenure (Months)
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Calculation'}</span>
          </button>
        </form>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Monthly EMI</div>
              <div className="font-mono-tabular text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(breakdown.monthlyEmi)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Interest</div>
              <div className="font-mono-tabular text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(breakdown.totalInterest)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Payable</div>
              <div className="font-mono-tabular text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(breakdown.totalPayable)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-400">
              <span>Principal Share: {breakdown.principalRatio}%</span>
              <span>Interest Share: {breakdown.interestRatio}%</span>
            </div>
            <div className="h-2.5 w-full bg-amber-500/80 rounded-md overflow-hidden flex">
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${breakdown.principalRatio}%` }}
              />
            </div>
            {postLoanDti !== null && (
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono-tabular pt-1">
                Projected Post-Loan DTI against saved income ({formatCurrency(profile?.monthlyIncome ?? 0)}/mo):{' '}
                <span className={postLoanDti > 45 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                  {postLoanDti}%
                </span>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Annual Amortization Summary
            </h2>
            <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 sticky top-0">
                  <tr>
                    <th className="py-2 px-4">Year</th>
                    <th className="py-2 px-4 text-right">Principal Paid</th>
                    <th className="py-2 px-4 text-right">Interest Paid</th>
                    <th className="py-2 px-4 text-right">Ending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono-tabular">
                  {breakdown.yearlySchedule.map((row) => (
                    <tr key={row.year}>
                      <td className="py-2 px-4 text-slate-700 dark:text-slate-300">Year {row.year}</td>
                      <td className="py-2 px-4 text-right text-slate-900 dark:text-slate-100">
                        {formatCurrency(row.principalPaid)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400">
                        {formatCurrency(row.interestPaid)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(row.endingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Saved EMI Calculations
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {calculations.length} saved
          </span>
        </div>

        {calculations.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No EMI calculations saved yet. Adjust parameters above and click &ldquo;Save Calculation&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Label</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">APR</th>
                  <th className="py-3 px-4 text-right">Tenure</th>
                  <th className="py-3 px-4 text-right">Monthly EMI</th>
                  <th className="py-3 px-4 text-right">Total Interest</th>
                  <th className="py-3 px-4">Saved</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {calculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6 font-semibold text-slate-900 dark:text-slate-100">
                      {editingId === calc.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() => handleRename(calc.id)}
                            aria-label="Confirm rename"
                            className="p-1 text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel rename"
                            className="p-1 text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        calc.label
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {formatCurrency(calc.principal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {calc.annualInterestRate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {calc.tenureMonths}m
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(calc.monthlyEmi)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                      {formatCurrency(calc.totalInterest)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(calc.createdAt)}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(calc.id);
                          setEditingLabel(calc.label);
                        }}
                        aria-label="Edit label"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mr-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(calc.id)}
                        aria-label="Delete EMI calculation"
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
