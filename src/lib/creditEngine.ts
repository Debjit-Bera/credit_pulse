import type {
  AlternativeLoanOption,
  CreditBand,
  FinancialProfile,
  LoanCheckDetail,
  LoanRiskLevel,
  RoadmapTask,
} from '../types/creditpulse';

export interface CreditScoreResult {
  score: number;
  band: CreditBand;
  utilizationRatio: number;
  dtiRatio: number;
  paymentHistoryScore: number;
  creditMixScore: number;
  monthlySurplus: number;
  summary: string;
  factors: {
    label: string;
    weight: string;
    scoreOutOf100: number;
    status: 'Strong' | 'Moderate' | 'Needs Attention';
    detail: string;
  }[];
}

export interface EmiBreakdown {
  monthlyEmi: number;
  totalInterest: number;
  totalPayable: number;
  principalRatio: number;
  interestRatio: number;
  yearlySchedule: {
    year: number;
    principalPaid: number;
    interestPaid: number;
    endingBalance: number;
  }[];
}

export interface LoanAnalysisComputation {
  loanType: string;
  requestedAmount: number;
  requestedTenureMonths: number;
  proposedMonthlyEmi: number;
  approvalOdds: number;
  riskLevel: LoanRiskLevel;
  passedChecksCount: number;
  scoreUsed: number;
  dtiPercent: number;
  utilizationPercent: number;
  failedCheckKeys: string[];
  recommendations: string[];
  checks: LoanCheckDetail[];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function calculateEmi(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EmiBreakdown {
  const safePrincipal = Math.max(1, Number(principal) || 1);
  const safeMonths = Math.max(1, Math.round(Number(tenureMonths) || 1));
  const safeRate = Math.max(0, Number(annualInterestRate) || 0);
  const monthlyRate = safeRate / 12 / 100;

  let monthlyEmi = 0;
  if (monthlyRate === 0) {
    monthlyEmi = safePrincipal / safeMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, safeMonths);
    monthlyEmi = (safePrincipal * monthlyRate * factor) / (factor - 1);
  }

  const totalPayable = monthlyEmi * safeMonths;
  const totalInterest = Math.max(0, totalPayable - safePrincipal);
  const principalRatio = totalPayable > 0 ? (safePrincipal / totalPayable) * 100 : 100;
  const interestRatio = totalPayable > 0 ? (totalInterest / totalPayable) * 100 : 0;

  const yearlySchedule: EmiBreakdown['yearlySchedule'] = [];
  let balance = safePrincipal;
  let yearPrincipal = 0;
  let yearInterest = 0;

  for (let m = 1; m <= safeMonths; m++) {
    const interestForMonth = balance * monthlyRate;
    const principalForMonth = Math.min(balance, Math.max(0, monthlyEmi - interestForMonth));
    balance = Math.max(0, balance - principalForMonth);
    yearPrincipal += principalForMonth;
    yearInterest += interestForMonth;

    if (m % 12 === 0 || m === safeMonths) {
      yearlySchedule.push({
        year: Math.ceil(m / 12),
        principalPaid: Math.round(yearPrincipal),
        interestPaid: Math.round(yearInterest),
        endingBalance: Math.round(balance),
      });
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }

  return {
    monthlyEmi: Math.round(monthlyEmi),
    totalInterest: Math.round(totalInterest),
    totalPayable: Math.round(totalPayable),
    principalRatio: Number(principalRatio.toFixed(1)),
    interestRatio: Number(interestRatio.toFixed(1)),
    yearlySchedule,
  };
}

export function getCreditBand(score: number): CreditBand {
  if (score >= 780) return 'Excellent';
  if (score >= 730) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 600) return 'Fair';
  return 'Poor';
}

export function calculateCreditScore(profile: FinancialProfile): CreditScoreResult {
  const income = Math.max(1, profile.monthlyIncome);
  const utilizationRatio =
    profile.totalCreditLimit > 0
      ? Number(((profile.creditCardBalance / profile.totalCreditLimit) * 100).toFixed(1))
      : 0;
  const dtiRatio = Number(((profile.existingEmis / income) * 100).toFixed(1));
  const monthlySurplus = Math.round(
    profile.monthlyIncome - profile.monthlyExpenses - profile.existingEmis
  );

  // 1. Payment History (35% weight)
  const missed = Math.max(0, profile.missedPayments12m);
  let paymentHistoryScore = 100;
  if (missed === 1) paymentHistoryScore = 76;
  else if (missed === 2) paymentHistoryScore = 54;
  else if (missed === 3) paymentHistoryScore = 35;
  else if (missed >= 4) paymentHistoryScore = 18;

  // 2. Credit Utilization (30% weight)
  let utilizationScore = 98;
  if (profile.totalCreditLimit <= 0) utilizationScore = 62;
  else if (utilizationRatio <= 10) utilizationScore = 98;
  else if (utilizationRatio <= 30) utilizationScore = 86;
  else if (utilizationRatio <= 50) utilizationScore = 64;
  else if (utilizationRatio <= 75) utilizationScore = 40;
  else utilizationScore = 20;

  // 3. Credit Age & Employment Stability (15% weight)
  const ageScore = Math.min(100, Math.round((profile.creditAgeMonths / 60) * 80 + 20));
  const tenureScore = Math.min(100, Math.round((profile.employmentTenureMonths / 36) * 75 + 25));
  const stabilityScore = Math.round(ageScore * 0.65 + tenureScore * 0.35);

  // 4. Inquiries & Credit Mix (10% weight)
  const inqPenalty = Math.min(75, profile.hardInquiries6m * 15);
  const creditMixScore = Math.max(20, Math.round(92 - inqPenalty + (profile.totalCreditLimit > 0 ? 8 : 0)));

  // 5. Debt-to-Income Capacity (10% weight)
  let dtiScore = 95;
  if (dtiRatio <= 20) dtiScore = 95;
  else if (dtiRatio <= 35) dtiScore = 82;
  else if (dtiRatio <= 45) dtiScore = 60;
  else if (dtiRatio <= 60) dtiScore = 36;
  else dtiScore = 15;

  const weightedIndex =
    paymentHistoryScore * 0.35 +
    utilizationScore * 0.30 +
    stabilityScore * 0.15 +
    creditMixScore * 0.10 +
    dtiScore * 0.10;

  const score = Math.min(900, Math.max(300, Math.round(300 + (weightedIndex / 100) * 600)));
  const band = getCreditBand(score);

  const summaryParts: string[] = [];
  if (missed > 0) {
    summaryParts.push(`${missed} missed payment(s) in the last 12 months reduced payment history strength.`);
  } else {
    summaryParts.push('Zero missed payments in the last 12 months supports your base score.');
  }
  if (utilizationRatio > 30) {
    summaryParts.push(`Credit utilization at ${utilizationRatio}% exceeds the 30% benchmark.`);
  } else {
    summaryParts.push(`Revolving utilization at ${utilizationRatio}% is within the healthy <=30% zone.`);
  }
  if (dtiRatio > 40) {
    summaryParts.push(`Existing EMIs consume ${dtiRatio}% of monthly income, tightening lender affordability.`);
  }

  return {
    score,
    band,
    utilizationRatio,
    dtiRatio,
    paymentHistoryScore: Math.round(paymentHistoryScore),
    creditMixScore: Math.round(creditMixScore),
    monthlySurplus,
    summary: summaryParts.join(' ').slice(0, 990),
    factors: [
      {
        label: 'Payment History',
        weight: '35%',
        scoreOutOf100: Math.round(paymentHistoryScore),
        status: paymentHistoryScore >= 85 ? 'Strong' : paymentHistoryScore >= 60 ? 'Moderate' : 'Needs Attention',
        detail: `${missed} missed payment(s) recorded over the past 12 months.`,
      },
      {
        label: 'Credit Utilization',
        weight: '30%',
        scoreOutOf100: Math.round(utilizationScore),
        status: utilizationScore >= 80 ? 'Strong' : utilizationScore >= 55 ? 'Moderate' : 'Needs Attention',
        detail: `${utilizationRatio}% of ${formatCurrency(profile.totalCreditLimit)} revolving limit utilized.`,
      },
      {
        label: 'Credit Age & Stability',
        weight: '15%',
        scoreOutOf100: stabilityScore,
        status: stabilityScore >= 75 ? 'Strong' : stabilityScore >= 55 ? 'Moderate' : 'Needs Attention',
        detail: `${profile.creditAgeMonths} months credit history · ${profile.employmentTenureMonths} months current employment.`,
      },
      {
        label: 'Inquiries & Credit Mix',
        weight: '10%',
        scoreOutOf100: Math.min(100, creditMixScore),
        status: creditMixScore >= 75 ? 'Strong' : creditMixScore >= 55 ? 'Moderate' : 'Needs Attention',
        detail: `${profile.hardInquiries6m} hard credit inquiry/inquiries in the past 6 months.`,
      },
      {
        label: 'Debt-to-Income Capacity',
        weight: '10%',
        scoreOutOf100: dtiScore,
        status: dtiScore >= 75 ? 'Strong' : dtiScore >= 55 ? 'Moderate' : 'Needs Attention',
        detail: `${dtiRatio}% of monthly income committed to existing EMIs.`,
      },
    ],
  };
}

const LOAN_TYPE_CONFIG: Record<string, { minScore: number; baseApr: number; maxDti: number }> = {
  'Personal Loan': { minScore: 690, baseApr: 12.5, maxDti: 45 },
  'Home Loan': { minScore: 710, baseApr: 8.6, maxDti: 50 },
  'Auto Loan': { minScore: 675, baseApr: 9.8, maxDti: 48 },
  'Education Loan': { minScore: 650, baseApr: 10.4, maxDti: 50 },
  'Business Loan': { minScore: 700, baseApr: 14.2, maxDti: 45 },
};

export function runLoanRejectionChecks(
  profile: FinancialProfile,
  scoreUsed: number,
  loanType: string,
  requestedAmount: number,
  requestedTenureMonths: number
): LoanAnalysisComputation {
  const config = LOAN_TYPE_CONFIG[loanType] ?? LOAN_TYPE_CONFIG['Personal Loan'];
  const emi = calculateEmi(requestedAmount, config.baseApr, requestedTenureMonths);
  const income = Math.max(1, profile.monthlyIncome);
  const postLoanDti = Number((((profile.existingEmis + emi.monthlyEmi) / income) * 100).toFixed(1));
  const utilizationPercent =
    profile.totalCreditLimit > 0
      ? Number(((profile.creditCardBalance / profile.totalCreditLimit) * 100).toFixed(1))
      : 0;
  const netSurplusAfterLoan = profile.monthlyIncome - profile.monthlyExpenses - profile.existingEmis - emi.monthlyEmi;

  const checks: LoanCheckDetail[] = [
    {
      key: 'credit_score',
      title: '1. Minimum Credit Score Threshold',
      passed: scoreUsed >= config.minScore,
      actualValue: `${scoreUsed}`,
      targetThreshold: `>= ${config.minScore}`,
      impactWeight: 22,
      explanation:
        scoreUsed >= config.minScore
          ? `Your score of ${scoreUsed} meets the ${config.minScore} underwriting floor for ${loanType}.`
          : `Score ${scoreUsed} sits ${config.minScore - scoreUsed} points below typical ${loanType} approval thresholds.`,
    },
    {
      key: 'dti_ratio',
      title: '2. Post-Loan Debt-to-Income (DTI)',
      passed: postLoanDti <= config.maxDti && netSurplusAfterLoan > 0,
      actualValue: `${postLoanDti}%`,
      targetThreshold: `<= ${config.maxDti}%`,
      impactWeight: 22,
      explanation:
        postLoanDti <= config.maxDti
          ? `Adding ${formatCurrency(emi.monthlyEmi)}/mo keeps total debt obligations within ${config.maxDti}% of income.`
          : `Existing EMIs plus the estimated ${formatCurrency(emi.monthlyEmi)}/mo push DTI to ${postLoanDti}%, creating repayment strain.`,
    },
    {
      key: 'utilization',
      title: '3. Revolving Credit Utilization',
      passed: utilizationPercent <= 30,
      actualValue: `${utilizationPercent}%`,
      targetThreshold: '<= 30%',
      impactWeight: 16,
      explanation:
        utilizationPercent <= 30
          ? `Card utilization of ${utilizationPercent}% signals controlled revolving credit usage.`
          : `Card utilization at ${utilizationPercent}% suggests high short-term credit reliance to underwriters.`,
    },
    {
      key: 'payment_history',
      title: '4. 12-Month Payment Discipline',
      passed: profile.missedPayments12m === 0,
      actualValue: `${profile.missedPayments12m} missed`,
      targetThreshold: '0 missed',
      impactWeight: 16,
      explanation:
        profile.missedPayments12m === 0
          ? 'Clean 12-month repayment track record with zero delinquencies.'
          : `${profile.missedPayments12m} recent missed payment(s) trigger automated risk flags at prime lenders.`,
    },
    {
      key: 'credit_age',
      title: '5. Credit History Seasoning',
      passed: profile.creditAgeMonths >= 12,
      actualValue: `${profile.creditAgeMonths} mos`,
      targetThreshold: '>= 12 mos',
      impactWeight: 8,
      explanation:
        profile.creditAgeMonths >= 12
          ? `Account seasoning of ${profile.creditAgeMonths} months provides sufficient credit track record.`
          : `Thin credit file (${profile.creditAgeMonths} months) makes traditional automated scoring cautious.`,
    },
    {
      key: 'hard_inquiries',
      title: '6. Recent Hard Inquiry Velocity',
      passed: profile.hardInquiries6m <= 2,
      actualValue: `${profile.hardInquiries6m} in 6m`,
      targetThreshold: '<= 2 in 6m',
      impactWeight: 8,
      explanation:
        profile.hardInquiries6m <= 2
          ? 'Low recent credit inquiry velocity shows measured borrowing behavior.'
          : `${profile.hardInquiries6m} recent inquiries signal credit-seeking urgency within a 6-month window.`,
    },
    {
      key: 'income_stability',
      title: '7. Employment & Surplus Stability',
      passed: profile.employmentTenureMonths >= 6 && profile.monthlyIncome >= 20000 && netSurplusAfterLoan >= 3000,
      actualValue: `${profile.employmentTenureMonths} mos · ${formatCurrency(netSurplusAfterLoan)} buffer`,
      targetThreshold: '>= 6 mos · positive buffer',
      impactWeight: 8,
      explanation:
        profile.employmentTenureMonths >= 6 && netSurplusAfterLoan >= 3000
          ? `Stable ${profile.employmentTenureMonths}-month employment with ${formatCurrency(netSurplusAfterLoan)} monthly cushion.`
          : 'Short job tenure or thin monthly cash surplus after expenses may prompt lender income verification or rejection.',
    },
  ];

  const failedChecks = checks.filter((c) => !c.passed);
  const passedChecksCount = checks.length - failedChecks.length;
  const rawOdds = checks.reduce((acc, c) => acc + (c.passed ? c.impactWeight : 0), 0);
  const approvalOdds = Math.min(97, Math.max(8, Math.round(rawOdds)));
  const riskLevel: LoanRiskLevel =
    approvalOdds >= 75 ? 'Low Risk' : approvalOdds >= 48 ? 'Moderate Risk' : 'High Risk';

  const recommendations: string[] = [];
  if (failedChecks.some((c) => c.key === 'utilization')) {
    const targetBal = Math.round(profile.totalCreditLimit * 0.28);
    const paydown = Math.max(0, Math.round(profile.creditCardBalance - targetBal));
    recommendations.push(
      `Pay down ${formatCurrency(paydown)} on credit cards to drop utilization under 30% before applying.`
    );
  }
  if (failedChecks.some((c) => c.key === 'dti_ratio')) {
    const longerTenure = Math.min(84, requestedTenureMonths + 24);
    recommendations.push(
      `Extend tenure to ${longerTenure} months or lower loan principal by 20% to keep total DTI below ${config.maxDti}%.`
    );
  }
  if (failedChecks.some((c) => c.key === 'credit_score')) {
    recommendations.push(
      `Build your score above ${config.minScore} over the next 60–90 days using the 3-Month Roadmap before submitting hard applications.`
    );
  }
  if (failedChecks.some((c) => c.key === 'payment_history')) {
    recommendations.push(
      'Enable auto-debit for all active EMIs and card minimums to record 3+ consecutive on-time billing cycles.'
    );
  }
  if (failedChecks.some((c) => c.key === 'hard_inquiries')) {
    recommendations.push(
      'Pause all new loan or credit card applications for 90 days so recent hard inquiries age off risk models.'
    );
  }
  if (failedChecks.some((c) => c.key === 'credit_age') || failedChecks.some((c) => c.key === 'income_stability')) {
    recommendations.push(
      'Consider a co-applicant with steady salaried income or an FD-backed credit line to offset thin file seasoning.'
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      'All 7 underwriting checks passed. Compare APRs across 2–3 pre-qualified lenders using soft pulls before locking your offer.'
    );
  }

  return {
    loanType,
    requestedAmount,
    requestedTenureMonths,
    proposedMonthlyEmi: emi.monthlyEmi,
    approvalOdds,
    riskLevel,
    passedChecksCount,
    scoreUsed,
    dtiPercent: postLoanDti,
    utilizationPercent,
    failedCheckKeys: failedChecks.map((c) => c.key),
    recommendations: recommendations.slice(0, 10),
    checks,
  };
}

export function buildThreeMonthRoadmap(
  profile: FinancialProfile,
  baselineScore: number
): {
  title: string;
  targetScore: number;
  month1Focus: string;
  month2Focus: string;
  month3Focus: string;
  tasks: RoadmapTask[];
} {
  const utilization =
    profile.totalCreditLimit > 0 ? (profile.creditCardBalance / profile.totalCreditLimit) * 100 : 0;
  const targetScore = Math.min(860, baselineScore + (baselineScore < 680 ? 65 : baselineScore < 750 ? 42 : 25));

  const tasks: RoadmapTask[] = [
    {
      id: 'm1_autopay',
      month: 1,
      title: 'Enable 100% auto-pay on EMIs & card minimums',
      detail: 'Eliminate late payment risk across every active credit facility.',
      estimatedPointImpact: '+15 to +25 pts',
    },
    {
      id: 'm1_utilization_cut',
      month: 1,
      title:
        utilization > 30
          ? `Reduce card balance below ${formatCurrency(Math.round(profile.totalCreditLimit * 0.3))}`
          : 'Maintain card utilization under 15% before statement close',
      detail: 'Card issuers report balances on statement generation date, not due date.',
      estimatedPointImpact: '+18 to +30 pts',
    },
    {
      id: 'm1_freeze_inquiries',
      month: 1,
      title: 'Freeze new credit card & BNPL applications',
      detail: `Current 6-month inquiry count: ${profile.hardInquiries6m}. Avoid adding hard pulls for 90 days.`,
      estimatedPointImpact: '+6 to +12 pts',
    },
    {
      id: 'm1_bureau_audit',
      month: 1,
      title: 'Audit bureau report for duplicate loans or wrong DPD',
      detail: 'File disputes immediately for any closed accounts still showing active balances.',
      estimatedPointImpact: '+5 to +20 pts',
    },
    {
      id: 'm2_midcycle_payment',
      month: 2,
      title: 'Pay revolving balances twice per billing cycle',
      detail: 'Make a mid-month payment 5 days prior to statement close to keep reported utilization low.',
      estimatedPointImpact: '+10 to +16 pts',
    },
    {
      id: 'm2_dti_trim',
      month: 2,
      title: 'Prepay smallest high-APR installment or consumer loan',
      detail: `Trim existing ${formatCurrency(profile.existingEmis)}/mo obligation to improve DTI headroom.`,
      estimatedPointImpact: '+8 to +14 pts',
    },
    {
      id: 'm2_keep_oldest',
      month: 2,
      title: 'Keep oldest credit card open with small recurring bill',
      detail: `Preserves your ${profile.creditAgeMonths}-month credit history depth.`,
      estimatedPointImpact: '+5 to +10 pts',
    },
    {
      id: 'm2_emergency_buffer',
      month: 2,
      title: 'Build 1-month EMI reserve buffer in primary account',
      detail: 'Prevents accidental NACH/auto-debit bounce fees during cashflow dips.',
      estimatedPointImpact: 'Stability guard',
    },
    {
      id: 'm3_limit_review',
      month: 3,
      title: 'Request soft-pull credit limit increase (if payment history is clean)',
      detail: 'Higher total limit lowers utilization ratio without extra spending.',
      estimatedPointImpact: '+8 to +15 pts',
    },
    {
      id: 'm3_prequalify_soft',
      month: 3,
      title: 'Run soft-eligibility check before formal loan submission',
      detail: 'Target lenders aligned with your updated score band to avoid rejection.',
      estimatedPointImpact: 'Approval optimization',
    },
    {
      id: 'm3_docs_pack',
      month: 3,
      title: 'Prepare 6-month bank statements & income proof in Document Vault',
      detail: 'Complete documentation accelerates underwriting and lowers manual review friction.',
      estimatedPointImpact: 'Faster sanction',
    },
    {
      id: 'm3_reassess',
      month: 3,
      title: 'Run final Smart Credit Score & 7-Check Loan Diagnostic',
      detail: 'Verify DTI <= 40% and utilization <= 25% prior to locking loan terms.',
      estimatedPointImpact: 'Readiness check',
    },
  ];

  return {
    title: '90-Day Credit Recovery & Loan Readiness Plan',
    targetScore,
    month1Focus:
      utilization > 30
        ? 'Stop utilization drag and lock zero-miss auto-debit across all accounts.'
        : 'Lock payment streaks, pause hard inquiries, and verify bureau accuracy.',
    month2Focus: 'Optimize statement-date balances and free up monthly DTI cashflow.',
    month3Focus: 'Strengthen credit limits, organize income proof, and pre-qualify cleanly.',
    tasks,
  };
}

export function generateAlternativeLoanOptions(
  profile: FinancialProfile,
  score: number,
  requestedAmount: number,
  tenureMonths: number
): AlternativeLoanOption[] {
  const safeAmount = Math.max(10000, requestedAmount || 200000);
  const safeTenure = Math.max(6, tenureMonths || 36);
  const income = Math.max(1, profile.monthlyIncome);
  const maxAffordableEmi = Math.max(2000, Math.round(income * 0.42 - profile.existingEmis));

  const tierSpread = score >= 750 ? 0 : score >= 690 ? 1.8 : score >= 640 ? 4.2 : 6.5;

  const securedApr = Number((9.25 + tierSpread * 0.45).toFixed(2));
  const securedEmi = calculateEmi(safeAmount, securedApr, safeTenure);

  const coApplicantApr = Number((10.9 + tierSpread * 0.65).toFixed(2));
  const coApplicantEmi = calculateEmi(safeAmount, coApplicantApr, safeTenure);

  const stepDownAmount = Math.max(15000, Math.round(safeAmount * 0.65));
  const stepDownApr = Number((12.4 + tierSpread * 0.75).toFixed(2));
  const stepDownEmi = calculateEmi(stepDownAmount, stepDownApr, safeTenure);

  const extendedTenure = Math.min(84, safeTenure + 24);
  const extendedApr = Number((13.1 + tierSpread * 0.7).toFixed(2));
  const extendedEmi = calculateEmi(safeAmount, extendedApr, extendedTenure);

  const creditBuilderAmount = Math.min(150000, Math.max(25000, Math.round(safeAmount * 0.35)));
  const creditBuilderApr = Number((9.9 + tierSpread * 0.3).toFixed(2));
  const creditBuilderEmi = calculateEmi(creditBuilderAmount, creditBuilderApr, Math.min(24, safeTenure));

  return [
    {
      id: 'fd_secured',
      category: 'FD / Collateral-Backed Loan',
      lenderType: 'Scheduled Bank · Secured Facility',
      eligibleAmount: safeAmount,
      estimatedApr: securedApr,
      tenureMonths: safeTenure,
      monthlyEmi: securedEmi.monthlyEmi,
      totalInterest: securedEmi.totalInterest,
      totalRepayment: securedEmi.totalPayable,
      approvalLikelihood: 'High (88%+)',
      rationale: 'Backed by fixed deposit or gold/property collateral, bypassing unsecured credit-score rejection.',
    },
    {
      id: 'co_applicant',
      category: 'Joint / Co-Applicant Loan',
      lenderType: 'Prime Bank / NBFC · Co-Signed',
      eligibleAmount: safeAmount,
      estimatedApr: coApplicantApr,
      tenureMonths: safeTenure,
      monthlyEmi: coApplicantEmi.monthlyEmi,
      totalInterest: coApplicantEmi.totalInterest,
      totalRepayment: coApplicantEmi.totalPayable,
      approvalLikelihood: score >= 640 ? 'Strong (78%)' : 'Moderate (64%)',
      rationale: 'Combines household income to lower effective DTI and qualify for prime interest slabs.',
    },
    {
      id: 'step_down',
      category: 'Right-Sized Principal Loan',
      lenderType: 'Digital NBFC · Unsecured',
      eligibleAmount: stepDownAmount,
      estimatedApr: stepDownApr,
      tenureMonths: safeTenure,
      monthlyEmi: stepDownEmi.monthlyEmi,
      totalInterest: stepDownEmi.totalInterest,
      totalRepayment: stepDownEmi.totalPayable,
      approvalLikelihood: stepDownEmi.monthlyEmi <= maxAffordableEmi ? 'High (80%)' : 'Moderate (58%)',
      rationale: `Matches your ${formatCurrency(maxAffordableEmi)}/mo comfortable EMI ceiling by reducing upfront principal by 35%.`,
    },
    {
      id: 'extended_tenure',
      category: 'Extended-Tenure Affordability Loan',
      lenderType: 'Bank / NBFC · Stretched Amortization',
      eligibleAmount: safeAmount,
      estimatedApr: extendedApr,
      tenureMonths: extendedTenure,
      monthlyEmi: extendedEmi.monthlyEmi,
      totalInterest: extendedEmi.totalInterest,
      totalRepayment: extendedEmi.totalPayable,
      approvalLikelihood: extendedEmi.monthlyEmi <= maxAffordableEmi ? 'Strong (74%)' : 'Moderate (52%)',
      rationale: `Extends repayment to ${extendedTenure} months to bring monthly EMI down to ${formatCurrency(extendedEmi.monthlyEmi)}.`,
    },
    {
      id: 'credit_builder',
      category: 'Credit-Builder Step-Up Facility',
      lenderType: 'Fintech / Small Finance Bank',
      eligibleAmount: creditBuilderAmount,
      estimatedApr: creditBuilderApr,
      tenureMonths: Math.min(24, safeTenure),
      monthlyEmi: creditBuilderEmi.monthlyEmi,
      totalInterest: creditBuilderEmi.totalInterest,
      totalRepayment: creditBuilderEmi.totalPayable,
      approvalLikelihood: 'Very High (90%+)',
      rationale: 'Short-term starter facility designed to add 6+ on-time bureau payment cycles before a larger loan.',
    },
  ];
}
