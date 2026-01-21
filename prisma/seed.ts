/**
 * Database Seed Script
 *
 * Seeds the database with initial rule modules and sample data for testing.
 *
 * [CPA VALIDATION REQUIRED] All tax rules in this seed require validation
 * before production use.
 */

import { PrismaClient, RuleCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Rule Modules
  await seedRuleModules();

  console.log('✅ Seeding complete!');
}

async function seedRuleModules() {
  console.log('📜 Seeding rule modules...');

  const ruleModules = [
    {
      code: 'REGIME_8PCT_ELIGIBILITY',
      version: '1.0.0',
      title: '8% Flat Tax Eligibility',
      description: 'Determines eligibility for the 8% flat tax option under TRAIN Law',
      category: RuleCategory.REGIME_DETERMINATION,
      legalBasis: {
        laws: ['NIRC Section 24(A)(2)(b)', 'RR No. 8-2018'],
        effectiveDate: '2018-01-01',
        cpaValidated: false,
        validationNotes: '[CPA VALIDATION REQUIRED] Please validate eligibility criteria against current BIR issuances',
      },
      plainLanguage: {
        summary: 'The 8% flat tax option allows eligible self-employed individuals to pay 8% of gross receipts above ₱250,000 instead of graduated rates plus percentage tax.',
        forBeginners: 'A simpler way to pay taxes - just 8% of what you earn above ₱250,000. No need to track expenses or file percentage tax separately.',
        examples: [
          { scenario: 'Freelancer earning ₱500,000/year', outcome: 'Eligible. Tax = 8% × ₱250,000 = ₱20,000' },
          { scenario: 'Business with ₱4,000,000 gross', outcome: 'NOT eligible - exceeds ₱3M VAT threshold' },
        ],
        commonMistakes: [
          'Choosing 8% when expenses are high (>40% of gross)',
          'Not filing quarterly even under 8% regime',
          'Switching regimes mid-year (not allowed)',
        ],
        relatedRules: ['TAX_COMPUTATION', 'FILING_OBLIGATIONS'],
      },
      ruleDefinition: {
        conditions: [
          { field: 'userType', operator: 'in', value: ['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS'] },
          { field: 'grossReceipts', operator: '<=', value: 3000000 },
        ],
        output: {
          eligibleTypes: ['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS'],
          grossReceiptsLimit: 3000000,
          exemptionThreshold: 250000,
          taxRate: 0.08,
        },
      },
      thresholds: {
        VAT_THRESHOLD: 3000000,
        EXEMPTION_THRESHOLD: 250000,
        TAX_RATE: 0.08,
      },
      isActive: true,
    },
    {
      code: 'GRADUATED_TAX_RATES',
      version: '1.0.0',
      title: 'Graduated Income Tax Rates',
      description: 'Tax brackets under TRAIN Law for graduated income tax computation',
      category: RuleCategory.REGIME_DETERMINATION,
      legalBasis: {
        laws: ['NIRC Section 24(A)(2)', 'TRAIN Law (RA 10963)'],
        effectiveDate: '2018-01-01',
        cpaValidated: false,
        validationNotes: '[CPA VALIDATION REQUIRED] Verify tax brackets are current for the applicable tax year',
      },
      plainLanguage: {
        summary: 'Progressive tax rates from 0% to 35% based on taxable income after deductions.',
        forBeginners: 'The more you earn, the higher percentage you pay. But you can subtract business expenses first to lower your taxable income.',
        examples: [
          { scenario: 'Taxable income of ₱400,000', outcome: 'Tax = ₱22,500 (0% on first ₱250K, 15% on rest)' },
          { scenario: 'Taxable income of ₱1,000,000', outcome: 'Tax = ₱152,500 (graduated brackets)' },
        ],
        commonMistakes: [
          'Not keeping receipts for deductions',
          'Claiming personal expenses as business deductions',
          'Forgetting to also pay percentage tax (3%)',
        ],
        relatedRules: ['DEDUCTION_RULES', 'FILING_OBLIGATIONS'],
      },
      ruleDefinition: {
        brackets: [
          { min: 0, max: 250000, rate: 0, baseTax: 0 },
          { min: 250001, max: 400000, rate: 0.15, baseTax: 0 },
          { min: 400001, max: 800000, rate: 0.20, baseTax: 22500 },
          { min: 800001, max: 2000000, rate: 0.25, baseTax: 102500 },
          { min: 2000001, max: 8000000, rate: 0.30, baseTax: 402500 },
          { min: 8000001, max: Infinity, rate: 0.35, baseTax: 2202500 },
        ],
      },
      thresholds: {
        BRACKET_1_MAX: 250000,
        BRACKET_2_MAX: 400000,
        BRACKET_3_MAX: 800000,
        BRACKET_4_MAX: 2000000,
        BRACKET_5_MAX: 8000000,
        OSD_RATE: 0.40,
      },
      isActive: true,
    },
    {
      code: 'QUARTERLY_FILING_1701Q',
      version: '1.0.0',
      title: 'Quarterly Income Tax Filing (Form 1701Q)',
      description: 'Requirements and deadlines for quarterly income tax returns',
      category: RuleCategory.FILING_OBLIGATION,
      legalBasis: {
        laws: ['NIRC Section 74', 'RR No. 8-2018'],
        effectiveDate: '2018-01-01',
        cpaValidated: false,
        validationNotes: '[CPA VALIDATION REQUIRED] Confirm current filing deadlines with BIR',
      },
      plainLanguage: {
        summary: 'Self-employed individuals must file quarterly income tax returns covering their business income.',
        forBeginners: 'File 3 times a year to report income and pay estimated taxes. This spreads out your tax payments throughout the year.',
        examples: [
          { scenario: 'Q1 filing', outcome: 'Due May 15 for income from January-March' },
          { scenario: 'Annual filing', outcome: 'Due April 15 next year, reconciles all quarterly payments' },
        ],
        commonMistakes: [
          'Missing quarterly deadlines',
          'Not accounting for withholding credits',
          'Filing with wrong RDO',
        ],
        relatedRules: ['DEADLINE_CALCULATION', 'PENALTY_RULES'],
      },
      ruleDefinition: {
        applicableTo: ['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS', 'MIXED_INCOME'],
        frequency: 'quarterly',
        deadlines: {
          Q1: { month: 5, day: 15 },
          Q2: { month: 8, day: 15 },
          Q3: { month: 11, day: 15 },
        },
      },
      thresholds: {
        Q1_DEADLINE_MONTH: 5,
        Q1_DEADLINE_DAY: 15,
        Q2_DEADLINE_MONTH: 8,
        Q2_DEADLINE_DAY: 15,
        Q3_DEADLINE_MONTH: 11,
        Q3_DEADLINE_DAY: 15,
      },
      isActive: true,
    },
    {
      code: 'PERCENTAGE_TAX_2551Q',
      version: '1.0.0',
      title: 'Percentage Tax (Form 2551Q)',
      description: '3% percentage tax for non-VAT registered businesses',
      category: RuleCategory.FILING_OBLIGATION,
      legalBasis: {
        laws: ['NIRC Section 116', 'RR No. 8-2018'],
        effectiveDate: '2018-01-01',
        cpaValidated: false,
        validationNotes: '[CPA VALIDATION REQUIRED] Verify percentage tax rate and exemptions',
      },
      plainLanguage: {
        summary: 'Non-VAT businesses must pay 3% percentage tax on gross sales/receipts, unless they chose the 8% flat tax option.',
        forBeginners: 'If you use graduated tax rates, you also need to pay this 3% tax on your sales. If you chose 8% flat tax, skip this - it is included.',
        examples: [
          { scenario: 'Using graduated rates', outcome: 'Pay 3% of gross quarterly via Form 2551Q' },
          { scenario: 'Using 8% flat tax', outcome: 'No separate percentage tax needed' },
        ],
        commonMistakes: [
          'Paying percentage tax while using 8% regime',
          'Not filing even with zero sales',
          'Confusing with VAT',
        ],
        relatedRules: ['REGIME_8PCT_ELIGIBILITY', 'FILING_OBLIGATIONS'],
      },
      ruleDefinition: {
        rate: 0.03,
        exemptions: ['EIGHT_PERCENT_FLAT'],
        frequency: 'quarterly',
        deadlines: {
          Q1: { month: 4, day: 25 },
          Q2: { month: 7, day: 25 },
          Q3: { month: 10, day: 25 },
          Q4: { month: 1, day: 25 },
        },
      },
      thresholds: {
        PERCENTAGE_TAX_RATE: 0.03,
      },
      isActive: true,
    },
    {
      code: 'LATE_FILING_PENALTIES',
      version: '1.0.0',
      title: 'Late Filing and Payment Penalties',
      description: 'Surcharges, interest, and compromise penalties for late compliance',
      category: RuleCategory.PENALTY_RULES,
      legalBasis: {
        laws: ['NIRC Sections 248-249', 'RR No. 12-99'],
        effectiveDate: '1999-01-01',
        cpaValidated: false,
        validationNotes: '[CPA VALIDATION REQUIRED] Verify current penalty rates and computation methods',
      },
      plainLanguage: {
        summary: 'Late filing incurs 25% surcharge plus 12% annual interest on unpaid tax.',
        forBeginners: 'File and pay on time! If late, you will pay extra: 25% penalty plus interest that grows every day.',
        examples: [
          { scenario: 'Filed 1 month late with ₱10,000 tax due', outcome: 'Surcharge: ₱2,500 + Interest: ~₱100' },
          { scenario: 'Paid late but filed on time', outcome: 'Only interest applies, no surcharge for filing' },
        ],
        commonMistakes: [
          'Not filing because they cannot pay (file anyway to avoid surcharge)',
          'Ignoring interest accumulation',
          'Not requesting penalty waiver when eligible',
        ],
        relatedRules: ['DEADLINE_CALCULATION', 'FILING_OBLIGATIONS'],
      },
      ruleDefinition: {
        surcharge: {
          lateFilingRate: 0.25,
          fraudRate: 0.50,
        },
        interest: {
          annualRate: 0.12,
          computationMethod: 'daily',
        },
      },
      thresholds: {
        SURCHARGE_RATE: 0.25,
        FRAUD_SURCHARGE_RATE: 0.50,
        INTEREST_RATE: 0.12,
      },
      isActive: true,
    },
  ];

  for (const module of ruleModules) {
    await prisma.ruleModule.upsert({
      where: {
        code_version: {
          code: module.code,
          version: module.version,
        },
      },
      update: module,
      create: module,
    });
    console.log(`  ✓ ${module.code} v${module.version}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
