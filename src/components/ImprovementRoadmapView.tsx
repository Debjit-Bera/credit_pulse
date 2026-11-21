import React, { useState } from 'react';
import { CheckSquare, RefreshCw, Square, Target, Trash2 } from 'lucide-react';
import { buildThreeMonthRoadmap, calculateCreditScore } from '../lib/creditEngine';
import {
  createOrResetImprovementPlan,
  deleteImprovementPlan,
  updateImprovementPlanProgress,
} from '../lib/firestoreService';
import type { FinancialProfile, ImprovementPlan, NavSection } from '../types/creditpulse';

interface ImprovementRoadmapViewProps {
  uid: string;
  profile: FinancialProfile | null;
  latestScore: number | null;
  plans: ImprovementPlan[];
  onNavigate: (section: NavSection) => void;
}

export function ImprovementRoadmapView({
  uid,
  profile,
  latestScore,
  plans,
  onNavigate,
}: ImprovementRoadmapViewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          Saved Financial Profile Required
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Save your financial profile first to generate a personalized 3-month credit improvement roadmap.
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
  const blueprint = buildThreeMonthRoadmap(profile, activeScore);
  const activePlan = plans[0] ?? null;
  const completedIds = activePlan?.completedTaskIds ?? [];
  const progressPercent = activePlan?.progressPercent ?? 0;

  async function handleGeneratePlan() {
    setBusy(true);
    setError(null);
    try {
      await createOrResetImprovementPlan(uid, {
        title: blueprint.title,
        baselineScore: activeScore,
        targetScore: blueprint.targetScore,
        completedTaskIds: [],
        totalTasks: blueprint.tasks.length,
        progressPercent: 0,
        month1Focus: blueprint.month1Focus,
        month2Focus: blueprint.month2Focus,
        month3Focus: blueprint.month3Focus,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save improvement plan.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleTask(taskId: string) {
    setError(null);
    if (!activePlan) {
      setBusy(true);
      try {
        const nextIds = [taskId];
        await createOrResetImprovementPlan(uid, {
          title: blueprint.title,
          baselineScore: activeScore,
          targetScore: blueprint.targetScore,
          completedTaskIds: nextIds,
          totalTasks: blueprint.tasks.length,
          progressPercent: Math.round((nextIds.length / blueprint.tasks.length) * 100),
          month1Focus: blueprint.month1Focus,
          month2Focus: blueprint.month2Focus,
          month3Focus: blueprint.month3Focus,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create roadmap.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const exists = completedIds.includes(taskId);
    const nextIds = exists
      ? completedIds.filter((id) => id !== taskId)
      : [...completedIds, taskId];
    try {
      await updateImprovementPlanProgress(
        uid,
        activePlan.id,
        nextIds,
        blueprint.tasks.length,
        activePlan.targetScore
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task progress.');
    }
  }

  async function handleDeletePlan() {
    if (!activePlan) return;
    setError(null);
    try {
      await deleteImprovementPlan(uid, activePlan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan.');
    }
  }

  const months: { month: 1 | 2 | 3; label: string; focus: string }[] = [
    {
      month: 1,
      label: 'Month 1 · Stabilize & Stop Drag',
      focus: activePlan?.month1Focus ?? blueprint.month1Focus,
    },
    {
      month: 2,
      label: 'Month 2 · Optimize Utilization & DTI',
      focus: activePlan?.month2Focus ?? blueprint.month2Focus,
    },
    {
      month: 3,
      label: 'Month 3 · Strengthen & Pre-Qualify',
      focus: activePlan?.month3Focus ?? blueprint.month3Focus,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Credit Improvement Guidelines
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Personalised 3-month action roadmap built from your utilization, inquiries, and DTI profile.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={handleGeneratePlan}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{activePlan ? 'Reset / Sync Roadmap' : 'Start 3-Month Plan'}</span>
          </button>
          {activePlan && (
            <button
              type="button"
              onClick={handleDeletePlan}
              aria-label="Delete saved improvement plan"
              className="p-2 text-slate-500 hover:text-rose-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {activePlan?.title ?? blueprint.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                Baseline {activePlan?.baselineScore ?? activeScore} · Target{' '}
                {activePlan?.targetScore ?? blueprint.targetScore} · {completedIds.length}/{blueprint.tasks.length} tasks completed
              </div>
            </div>
          </div>
          <div className="font-mono-tabular text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {progressPercent}%
          </div>
        </div>
        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {months.map((m) => {
          const monthTasks = blueprint.tasks.filter((t) => t.month === m.month);
          return (
            <div
              key={m.month}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4"
            >
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  {m.label}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{m.focus}</p>
              </div>

              <div className="space-y-3">
                {monthTasks.map((task) => {
                  const done = completedIds.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-2.5 ${
                        done
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-semibold ${
                            done
                              ? 'line-through text-slate-500 dark:text-slate-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {task.detail}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-emerald-700 dark:text-emerald-400 mt-1">
                          Impact: {task.estimatedPointImpact}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
