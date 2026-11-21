import React, { useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { calculateCreditScore } from '../lib/creditEngine';
import { auth } from '../lib/firebase';
import { deleteChatMessage, saveChatMessage } from '../lib/firestoreService';
import type {
  ChatMessage,
  FinancialProfile,
  ImprovementPlan,
  LoanRejectionAnalysis,
} from '../types/creditpulse';

interface AiAssistantViewProps {
  uid: string;
  profile: FinancialProfile | null;
  latestScore: number | null;
  latestAnalysis: LoanRejectionAnalysis | null;
  activePlan: ImprovementPlan | null;
  messages: ChatMessage[];
}

const STARTER_PROMPTS = [
  'Why might my loan application be flagged right now and what fixes it fastest?',
  'How much card balance should I pay down to push my score above 760?',
  'Compare taking a 36-month vs 60-month loan on my current DTI ratio.',
];

export function AiAssistantView({
  uid,
  profile,
  latestScore,
  latestAnalysis,
  activePlan,
  messages,
}: AiAssistantViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const computed = profile ? calculateCreditScore(profile) : null;
  const activeScore = latestScore ?? computed?.score ?? 680;
  const activeBand = computed?.band ?? 'Good';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setInput('');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Authentication session missing. Please sign in again.');
      }

      // Persist user message in Firestore
      await saveChatMessage(uid, 'user', trimmed, activeScore);

      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          financialProfile: profile,
          latestScore: activeScore,
          latestBand: activeBand,
          failedChecks: latestAnalysis?.failedCheckKeys ?? [],
          improvementProgress: activePlan?.progressPercent ?? 0,
        }),
      });

      const payload = (await resp.json()) as { reply?: string; error?: string };
      if (!resp.ok || !payload.reply) {
        throw new Error(payload.error || 'Gemini AI assistant request failed.');
      }

      await saveChatMessage(uid, 'assistant', payload.reply, activeScore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to get AI response.');
    } finally {
      setSending(false);
    }
  }

  async function handleClearAll() {
    setError(null);
    try {
      await Promise.all(messages.map((m) => deleteChatMessage(uid, m.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear chat history.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            CreditPulse AI Assistant
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Powered by Gemini on the server · Grounded in your saved profile (Score {activeScore} · {activeBand}) and persisted to Firestore.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:text-rose-600 rounded-lg whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col h-[580px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Ask anything about your credit score or loan strategy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your saved monthly income, card utilization, DTI, and roadmap progress are automatically supplied to Gemini.
                </p>
              </div>
              <div className="w-full space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left p-3 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-lg transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] opacity-75 mb-1 font-mono-tabular">
                    {msg.role === 'user' ? 'You' : 'CreditPulse AI'} · Score context {msg.contextScore}
                  </div>
                  <div>{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                Analyzing your financial profile with Gemini...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a personalised credit or loan question..."
            maxLength={2000}
            className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
