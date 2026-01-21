import { describe, it, expect, beforeEach } from 'vitest';
import { RegimeDeterminationRule } from '../../src/rules-engine/rules/regime-determination.rule';
import {
  RuleInput,
  UserType,
  RegistrationStatus,
  TaxRegime,
  IncomeType,
  IncomeFrequency,
} from '../../src/rules-engine/types';

describe('RegimeDeterminationRule', () => {
  let rule: RegimeDeterminationRule;

  beforeEach(() => {
    rule = new RegimeDeterminationRule();
  });

  const createBaseInput = (overrides?: Partial<RuleInput>): RuleInput => ({
    taxYear: 2024,
    userType: UserType.FREELANCER,
    registrationStatus: RegistrationStatus.REGISTERED,
    hasEmploymentIncome: false,
    incomeStreams: [],
    expenses: [],
    selectedRegime: TaxRegime.UNDETERMINED,
    ...overrides,
  });

  describe('8% Eligibility', () => {
    it('should be eligible for freelancer with income under 3M', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 500000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.eligible8Percent).toBe(true);
      expect(result.recommendation).toBeDefined();
    });

    it('should NOT be eligible when gross exceeds 3M (VAT threshold)', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 3500000, // Exceeds 3M
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.eligible8Percent).toBe(false);
      expect(result.eligibilityReason).toContain('3,000,000');
    });

    it('should be eligible for mixed income on business portion', () => {
      const input = createBaseInput({
        userType: UserType.MIXED_INCOME,
        hasEmploymentIncome: true,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.EMPLOYMENT,
            grossAmount: 500000,
            frequency: IncomeFrequency.MONTHLY,
            hasWithholding: true,
            withheldAmount: 50000,
            form2307Received: false,
          },
          {
            id: '2',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 300000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.eligible8Percent).toBe(true);
      expect(result.eligibilityReason).toContain('business/professional income');
    });
  });

  describe('Tax Computation Comparison', () => {
    it('should compute 8% tax correctly', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 600000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      // 8% of (600,000 - 250,000) = 8% of 350,000 = 28,000
      expect(result.comparison.eightPercent.estimatedTax).toBe(28000);
    });

    it('should recommend graduated rates when expenses are high', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 1000000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
        expenses: [
          { id: '1', category: 'RENT' as any, amount: 300000, isDeductible: true },
          { id: '2', category: 'UTILITIES' as any, amount: 100000, isDeductible: true },
          { id: '3', category: 'SUPPLIES' as any, amount: 200000, isDeductible: true },
        ],
      });

      const result = rule.execute(input);

      // 60% expenses ratio should favor graduated rates
      expect(result.recommendation).toBe(TaxRegime.GRADUATED_RATES);
      expect(result.recommendationReason).toContain('expenses');
    });

    it('should recommend 8% when expenses are low', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 500000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
        expenses: [
          { id: '1', category: 'SUPPLIES' as any, amount: 50000, isDeductible: true },
        ],
      });

      const result = rule.execute(input);

      // Low expenses (10%) should favor 8%
      expect(result.eligible8Percent).toBe(true);
    });
  });

  describe('Regime Comparison Data', () => {
    it('should include pros and cons for both regimes', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 500000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.comparison.eightPercent.pros.length).toBeGreaterThan(0);
      expect(result.comparison.eightPercent.cons.length).toBeGreaterThan(0);
      expect(result.comparison.graduatedRates.pros.length).toBeGreaterThan(0);
      expect(result.comparison.graduatedRates.cons.length).toBeGreaterThan(0);
    });

    it('should calculate effective tax rates', () => {
      const input = createBaseInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 500000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.comparison.eightPercent.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result.comparison.graduatedRates.effectiveRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Plain Language Explanation', () => {
    it('should provide beginner-friendly explanation', () => {
      const explanation = rule.getPlainLanguageExplanation();

      expect(explanation.summary).toBeDefined();
      expect(explanation.forBeginners).toBeDefined();
      expect(explanation.examples.length).toBeGreaterThan(0);
    });
  });
});
