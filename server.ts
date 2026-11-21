import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  appId: string;
}

interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface FinancialProfilePayload {
  fullName?: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingEmis?: number;
  totalCreditLimit?: number;
  creditCardBalance?: number;
  creditAgeMonths?: number;
  missedPayments12m?: number;
  hardInquiries6m?: number;
  employmentType?: string;
  employmentTenureMonths?: number;
  requestedLoanAmount?: number;
  requestedTenureMonths?: number;
  loanPurpose?: string;
}

interface VerifiedFirebaseUser {
  localId: string;
  email?: string;
  emailVerified?: boolean;
}

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '1mb' }));

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: FirebaseAppletConfig | null = null;
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseAppletConfig;
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json:', err);
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  if (!firebaseConfig?.apiKey || !idToken) {
    return null;
  }
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) {
      return null;
    }
    const payload = (await resp.json()) as { users?: VerifiedFirebaseUser[] };
    const user = payload.users?.[0];
    if (!user?.localId) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    firebaseConfigured: Boolean(firebaseConfig?.projectId && firebaseConfig?.apiKey),
    firebaseProjectId: firebaseConfig?.projectId ?? null,
    firestoreDatabaseId: firebaseConfig?.firestoreDatabaseId ?? null,
  });
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in to use CreditPulse AI.' });
    return;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser) {
    res.status(401).json({ error: 'Your sign-in session could not be verified. Please sign in again.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to enable the AI Assistant.',
    });
    return;
  }

  const body = req.body as {
    message?: unknown;
    history?: unknown;
    financialProfile?: FinancialProfilePayload | null;
    latestScore?: number | null;
    latestBand?: string | null;
    failedChecks?: string[] | null;
    improvementProgress?: number | null;
  };

  if (typeof body.message !== 'string' || body.message.trim().length === 0 || body.message.length > 2000) {
    res.status(400).json({ error: 'Please provide a message between 1 and 2,000 characters.' });
    return;
  }

  const history: ChatHistoryTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is ChatHistoryTurn =>
            Boolean(item) &&
            typeof item === 'object' &&
            ((item as ChatHistoryTurn).role === 'user' || (item as ChatHistoryTurn).role === 'assistant') &&
            typeof (item as ChatHistoryTurn).content === 'string' &&
            (item as ChatHistoryTurn).content.length <= 4000
        )
        .slice(-12)
    : [];

  const profile = body.financialProfile;
  const utilization =
    profile && profile.totalCreditLimit && profile.totalCreditLimit > 0
      ? (((profile.creditCardBalance ?? 0) / profile.totalCreditLimit) * 100).toFixed(1)
      : 'N/A';
  const dti =
    profile && profile.monthlyIncome && profile.monthlyIncome > 0
      ? (((profile.existingEmis ?? 0) / profile.monthlyIncome) * 100).toFixed(1)
      : 'N/A';

  const contextLines = [
    'You are CreditPulse AI, an objective, practical personal credit and loan readiness advisor.',
    'Always ground your answers in the user’s actual saved financial profile below. Be concise, specific, and structured with concrete numbers and action steps. Never fabricate credit bureau data you were not given, and clarify that estimates are educational diagnostics rather than official bureau pulls.',
    '',
    'User Saved Financial Context:',
    `- Name: ${profile?.fullName || 'Member'}`,
    `- Latest CreditPulse Score: ${body.latestScore ?? 'Not calculated yet'} (${body.latestBand ?? 'Unrated'})`,
    `- Monthly Income: ${profile?.monthlyIncome ?? 'Not set'}`,
    `- Monthly Living Expenses: ${profile?.monthlyExpenses ?? 'Not set'}`,
    `- Existing Monthly EMIs: ${profile?.existingEmis ?? 'Not set'}`,
    `- Current DTI Ratio (existing EMIs / income): ${dti}%`,
    `- Total Credit Card Limit: ${profile?.totalCreditLimit ?? 'Not set'}`,
    `- Current Credit Card Balance: ${profile?.creditCardBalance ?? 'Not set'} (Utilization: ${utilization}%)`,
    `- Credit History Age (months): ${profile?.creditAgeMonths ?? 'Not set'}`,
    `- Missed Payments (last 12m): ${profile?.missedPayments12m ?? 'Not set'}`,
    `- Hard Inquiries (last 6m): ${profile?.hardInquiries6m ?? 'Not set'}`,
    `- Employment: ${profile?.employmentType ?? 'Not set'} (${profile?.employmentTenureMonths ?? 0} months tenure)`,
    `- Requested Loan Goal: ${profile?.requestedLoanAmount ?? 'Not set'} over ${profile?.requestedTenureMonths ?? 'N/A'} months for ${profile?.loanPurpose ?? 'General'}`,
    `- Latest Failed Loan Checks: ${body.failedChecks && body.failedChecks.length > 0 ? body.failedChecks.join(', ') : 'None flagged yet'}`,
    `- 3-Month Roadmap Progress: ${body.improvementProgress ?? 0}%`,
  ].join('\n');

  const conversationContents = [
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })),
    {
      role: 'user',
      parts: [{ text: body.message.trim() }],
    },
  ];

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: conversationContents,
      config: {
        systemInstruction: contextLines,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
      return;
    }

    res.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reach Gemini API.';
    console.error('Gemini API error:', message);
    res.status(502).json({ error: `AI service error: ${message}` });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CreditPulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CreditPulse server:', err);
  process.exit(1);
});
