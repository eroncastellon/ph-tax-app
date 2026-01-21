/**
 * Philippine Tax Rules Engine - Type Definitions
 *
 * IMPORTANT: All thresholds and tax computations in this file require CPA validation
 * before production use. Values are based on published BIR regulations but may change.
 */

// ============================================================================
// RULE ENGINE CORE TYPES
// ============================================================================

export interface RuleInput {
  taxYear: number;
  userType: UserType;
  registrationStatus: RegistrationStatus;
  hasEmploymentIncome: boolean;
  incomeStreams: IncomeStreamData[];
  expenses: ExpenseData[];
  selectedRegime?: TaxRegime;
  tin?: string;
}

export interface IncomeStreamData {
  id: string;
  incomeType: IncomeType;
  grossAmount: number;
  frequency: IncomeFrequency;
  hasWithholding: boolean;
  withheldAmount?: number;
  withholdingRate?: number;
  form2307Received: boolean;
}

export interface ExpenseData {
  id: string;
  category: ExpenseCategory;
  amount: number;
  isDeductible: boolean;
}

// ============================================================================
// ENUMS (Mirroring Prisma schema)
// ============================================================================

export enum UserType {
  FREELANCER = 'FREELANCER',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  MICRO_SMALL_BUSINESS = 'MICRO_SMALL_BUSINESS',
  MIXED_INCOME = 'MIXED_INCOME',
}

export enum RegistrationStatus {
  NOT_REGISTERED = 'NOT_REGISTERED',
  PENDING_REGISTRATION = 'PENDING_REGISTRATION',
  REGISTERED = 'REGISTERED',
  NEEDS_UPDATE = 'NEEDS_UPDATE',
}

export enum TaxRegime {
  GRADUATED_RATES = 'GRADUATED_RATES',
  EIGHT_PERCENT_FLAT = 'EIGHT_PERCENT_FLAT',
  UNDETERMINED = 'UNDETERMINED',
}

export enum IncomeType {
  FREELANCE_SERVICE = 'FREELANCE_SERVICE',
  BUSINESS_SALES = 'BUSINESS_SALES',
  EMPLOYMENT = 'EMPLOYMENT',
  RENTAL = 'RENTAL',
  ROYALTIES = 'ROYALTIES',
  OTHER = 'OTHER',
}

export enum IncomeFrequency {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  IRREGULAR = 'IRREGULAR',
}

export enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  SUPPLIES = 'SUPPLIES',
  PROFESSIONAL_FEES = 'PROFESSIONAL_FEES',
  TRANSPORTATION = 'TRANSPORTATION',
  COMMUNICATION = 'COMMUNICATION',
  DEPRECIATION = 'DEPRECIATION',
  SALARIES_WAGES = 'SALARIES_WAGES',
  TAXES_LICENSES = 'TAXES_LICENSES',
  INSURANCE = 'INSURANCE',
  INTEREST_EXPENSE = 'INTEREST_EXPENSE',
  REPAIRS_MAINTENANCE = 'REPAIRS_MAINTENANCE',
  ADVERTISING = 'ADVERTISING',
  BAD_DEBTS = 'BAD_DEBTS',
  OTHER_DEDUCTIBLE = 'OTHER_DEDUCTIBLE',
}

export enum RiskLevel {
  NONE = 'NONE',
  INFO = 'INFO',
  WARNING = 'WARNING',
  CPA_REVIEW_REQUIRED = 'CPA_REVIEW_REQUIRED',
}

// ============================================================================
// RULE OUTPUT TYPES
// ============================================================================

export interface RegimeComparisonResult {
  eligible8Percent: boolean;
  eligibilityReason: string;
  comparison: {
    eightPercent: {
      estimatedTax: number;
      effectiveRate: number;
      pros: string[];
      cons: string[];
    };
    graduatedRates: {
      estimatedTax: number;
      effectiveRate: number;
      pros: string[];
      cons: string[];
    };
  };
  recommendation: TaxRegime;
  recommendationReason: string;
  ruleModuleId: string;
}

export interface ComputedValues {
  grossIncome: number;
  businessIncome: number; // Non-employment income
  employmentIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  estimatedTax: number;
  creditsApplied: number; // From withholding taxes
  netTaxPayable: number;
  quarterlyPayments: {
    q1: number;
    q2: number;
    q3: number;
    annual: number; // Annual true-up
  };
}

export interface Obligation {
  id: string;
  formCode: string; // e.g., "1701Q", "2551Q"
  formName: string;
  description: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  isApplicable: boolean;
  ruleModuleId: string;
  notes: string;
}

export interface Deadline {
  id: string;
  obligationId: string;
  formCode: string;
  description: string;
  dueDate: string; // ISO date
  period: string; // e.g., "Q1 2024"
  reminderDays: number[];
  penaltyInfo: string;
}

export interface RiskFlag {
  id: string;
  level: RiskLevel;
  code: string;
  title: string;
  description: string;
  ruleModuleId: string;
  recommendedAction: string;
  affectedFields: string[];
}

export interface ReasoningStep {
  stepNumber: number;
  ruleModuleId: string;
  ruleModuleVersion: string;
  input: Record<string, any>;
  output: Record<string, any>;
  explanation: string;
}

export interface ReasoningReceipt {
  steps: ReasoningStep[];
  explanationIds: string[];
  completeness: {
    score: number; // 0-100
    missingFields: string[];
    warnings: string[];
  };
}

export interface AssessmentOutput {
  recommendedRegime: TaxRegime;
  regimeComparison: RegimeComparisonResult;
  computedValues: ComputedValues;
  obligations: Obligation[];
  deadlines: Deadline[];
  riskFlags: RiskFlag[];
  reasoningReceipt: ReasoningReceipt;
  rulesEngineVersion: string;
}

// ============================================================================
// TAX THRESHOLDS [CPA VALIDATION REQUIRED]
// These values should be validated against current BIR regulations
// ============================================================================

export const TAX_THRESHOLDS = {
  // VAT Registration Threshold
  // [CPA VALIDATION REQUIRED] Based on TRAIN Law
  VAT_THRESHOLD: 3_000_000,

  // 8% Flat Tax Eligibility
  // [CPA VALIDATION REQUIRED] Based on RR No. 8-2018
  EIGHT_PERCENT_GROSS_LIMIT: 3_000_000,

  // Personal Exemption (First 250K is tax-free for self-employed)
  // [CPA VALIDATION REQUIRED] Based on TRAIN Law Section 24(A)(2)(b)
  PERSONAL_EXEMPTION_THRESHOLD: 250_000,

  // 8% Flat Tax Rate
  EIGHT_PERCENT_RATE: 0.08,

  // Optional Standard Deduction (OSD) Rate - 40% of gross
  // [CPA VALIDATION REQUIRED] NIRC Section 34(L)
  OSD_RATE: 0.40,
} as const;

// ============================================================================
// GRADUATED TAX RATES [CPA VALIDATION REQUIRED]
// Based on TRAIN Law (RA 10963) effective 2018-2022 and beyond
// These brackets apply to taxable income AFTER the 250K exemption
// ============================================================================

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  baseTax: number;
}

export const GRADUATED_TAX_BRACKETS_2023: TaxBracket[] = [
  // [CPA VALIDATION REQUIRED] These are 2023+ rates under TRAIN Law
  { min: 0, max: 250_000, rate: 0, baseTax: 0 },
  { min: 250_001, max: 400_000, rate: 0.15, baseTax: 0 },
  { min: 400_001, max: 800_000, rate: 0.20, baseTax: 22_500 },
  { min: 800_001, max: 2_000_000, rate: 0.25, baseTax: 102_500 },
  { min: 2_000_001, max: 8_000_000, rate: 0.30, baseTax: 402_500 },
  { min: 8_000_001, max: Infinity, rate: 0.35, baseTax: 2_202_500 },
];

// ============================================================================
// FILING DEADLINE CONFIGURATION [CPA VALIDATION REQUIRED]
// ============================================================================

export interface DeadlineConfig {
  formCode: string;
  quarterDeadlines: {
    Q1: { month: number; day: number }; // For income Jan-Mar
    Q2: { month: number; day: number }; // For income Apr-Jun
    Q3: { month: number; day: number }; // For income Jul-Sep
    Q4?: { month: number; day: number }; // For income Oct-Dec (usually annual)
  };
  annualDeadline?: { month: number; day: number };
  description: string;
}

export const FILING_DEADLINES: Record<string, DeadlineConfig> = {
  // [CPA VALIDATION REQUIRED] Quarterly Income Tax Return
  '1701Q': {
    formCode: '1701Q',
    quarterDeadlines: {
      Q1: { month: 5, day: 15 }, // May 15 for Q1
      Q2: { month: 8, day: 15 }, // Aug 15 for Q2
      Q3: { month: 11, day: 15 }, // Nov 15 for Q3
    },
    description: 'Quarterly Income Tax Return for Self-Employed Individuals, Estates and Trusts',
  },

  // [CPA VALIDATION REQUIRED] Annual Income Tax Return
  '1701': {
    formCode: '1701',
    quarterDeadlines: {
      Q1: { month: 4, day: 15 }, // April 15 annual
      Q2: { month: 4, day: 15 },
      Q3: { month: 4, day: 15 },
    },
    annualDeadline: { month: 4, day: 15 },
    description: 'Annual Income Tax Return for Individuals (including Mixed Income)',
  },

  // [CPA VALIDATION REQUIRED] Percentage Tax (for non-VAT)
  '2551Q': {
    formCode: '2551Q',
    quarterDeadlines: {
      Q1: { month: 4, day: 25 }, // April 25 for Q1
      Q2: { month: 7, day: 25 }, // July 25 for Q2
      Q3: { month: 10, day: 25 }, // Oct 25 for Q3
      Q4: { month: 1, day: 25 }, // Jan 25 for Q4 (next year)
    },
    description: 'Quarterly Percentage Tax Return',
  },
};

// ============================================================================
// RULE MODULE INTERFACE
// ============================================================================

export interface RuleModule {
  id: string;
  code: string;
  version: string;
  title: string;
  execute(input: RuleInput): any;
  getPlainLanguageExplanation(): {
    summary: string;
    forBeginners: string;
    examples: Array<{ scenario: string; outcome: string }>;
  };
}
