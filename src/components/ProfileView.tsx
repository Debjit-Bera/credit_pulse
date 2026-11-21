import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { calculateCreditScore, formatCurrency } from '../lib/creditEngine';
import { saveFinancialProfile } from '../lib/firestoreService';
import type { EmploymentType, FinancialProfile } from '../types/creditpulse';

interface ProfileViewProps {
  uid: string;
  userEmail: string;
  profile: FinancialProfile | null;
}

export function ProfileView({ uid, userEmail, profile }: ProfileViewProps) {
  const [form, setForm] = useState({
    fullName: profile?.fullName ?? '',
    email: profile?.email ?? userEmail,
    monthlyIncome: profile?.monthlyIncome ?? 85000,
    monthlyExpenses: profile?.monthlyExpenses ?? 32000,
    existingEmis: profile?.existingEmis ?? 12000,
    totalCreditLimit: profile?.totalCreditLimit ?? 200000,
    creditCardBalance: profile?.creditCardBalance ?? 42000,
    creditAgeMonths: profile?.creditAgeMonths ?? 38,
    missedPayments12m: profile?.missedPayments12m ?? 0,
    hardInquiries6m: profile?.hardInquiries6m ?? 1,
    employmentType: (profile?.employmentType ?? 'salaried') as EmploymentType,
    employmentTenureMonths: profile?.employmentTenureMonths ?? 28,
    requestedLoanAmount: profile?.requestedLoanAmount ?? 500000,
    requestedTenureMonths: profile?.requestedTenureMonths ?? 36,
    loanPurpose: profile?.loanPurpose ?? 'Personal Consolidation',
  });

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName,
        email: profile.email,
        monthlyIncome: profile.monthlyIncome,
        monthlyExpenses: profile.monthlyExpenses,
        existingEmis: profile.existingEmis,
        totalCreditLimit: profile.totalCreditLimit,
        creditCardBalance: profile.creditCardBalance,
        creditAgeMonths: profile.creditAgeMonths,
        missedPayments12m: profile.missedPayments12m,
        hardInquiries6m: profile.hardInquiries6m,
        employmentType: profile.employmentType,
        employmentTenureMonths: profile.employmentTenureMonths,
        requestedLoanAmount: profile.requestedLoanAmount,
        requestedTenureMonths: profile.requestedTenureMonths,
        loanPurpose: profile.loanPurpose,
      });
    }
  }, [profile]);

  const previewScore = calculateCreditScore({
    userId: uid,
    ...form,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      await saveFinancialProfile(uid, form);
      setSavedMsg('Financial profile saved to Firestore. All 6 CreditPulse tools now use these values.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save financial profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Saved Financial Profile
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Update your income, obligations, and credit metrics once. Every CreditPulse feature reads directly from this Firestore profile.
          </p>
        </div>
        <div className="text-right font-mono-tabular">
          <div className="text-xs text-slate-500 dark:text-slate-400">Live Score Preview</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {previewScore.score} · {previewScore.band}
          </div>
        </div>
      </div>

      {savedMsg && (
        <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Identity & Employment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Employment Type
              </label>
              <select
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="salaried">Salaried</option>
                <option value="self_employed">Self-Employed</option>
                <option value="freelancer">Freelancer</option>
                <option value="business_owner">Business Owner</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Employment Tenure (Months)
              </label>
              <input
                type="number"
                min={0}
                max={600}
                value={form.employmentTenureMonths}
                onChange={(e) => setForm({ ...form, employmentTenureMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Monthly Cashflow & Obligations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Monthly Net Income (INR)
              </label>
              <input
                type="number"
                min={0}
                value={form.monthlyIncome}
                onChange={(e) => setForm({ ...form, monthlyIncome: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Monthly Living Expenses (INR)
              </label>
              <input
                type="number"
                min={0}
                value={form.monthlyExpenses}
                onChange={(e) => setForm({ ...form, monthlyExpenses: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Existing Monthly EMIs (INR)
              </label>
              <input
                type="number"
                min={0}
                value={form.existingEmis}
                onChange={(e) => setForm({ ...form, existingEmis: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            Computed Monthly Surplus: {formatCurrency(previewScore.monthlySurplus)} · Current DTI: {previewScore.dtiRatio}%
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Credit Bureau Profile & Target Loan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Total Credit Card Limit (INR)
              </label>
              <input
                type="number"
                min={0}
                value={form.totalCreditLimit}
                onChange={(e) => setForm({ ...form, totalCreditLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Current Card Balance (INR)
              </label>
              <input
                type="number"
                min={0}
                value={form.creditCardBalance}
                onChange={(e) => setForm({ ...form, creditCardBalance: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Credit History Age (Months)
              </label>
              <input
                type="number"
                min={0}
                max={720}
                value={form.creditAgeMonths}
                onChange={(e) => setForm({ ...form, creditAgeMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Missed Payments (Last 12m)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={form.missedPayments12m}
                onChange={(e) => setForm({ ...form, missedPayments12m: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Hard Inquiries (Last 6m)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={form.hardInquiries6m}
                onChange={(e) => setForm({ ...form, hardInquiries6m: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Target Loan Amount (INR)
              </label>
              <input
                type="number"
                min={1000}
                value={form.requestedLoanAmount}
                onChange={(e) => setForm({ ...form, requestedLoanAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Target Tenure (Months)
              </label>
              <input
                type="number"
                min={1}
                max={360}
                value={form.requestedTenureMonths}
                onChange={(e) => setForm({ ...form, requestedTenureMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Primary Loan Purpose
              </label>
              <input
                type="text"
                required
                value={form.loanPurpose}
                onChange={(e) => setForm({ ...form, loanPurpose: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving to Firestore...' : 'Save Financial Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
