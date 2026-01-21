import { describe, it, expect, beforeEach } from 'vitest';
import { TaxComputationRule } from '../../src/rules-engine/rules/tax-computation.rule';
import {
  RuleInput,
  UserType,
  RegistrationStatus,
  TaxRegime,
  IncomeType,
  IncomeFrequency,
  TAX_THRESHOLDS,
} from '../../src/rules-engine/types';

describe('TaxComputationRule', () => {
  let rule: TaxComputationRule;

  beforeEach(() => {
    rule = new TaxComputationRule();
  });

  const createInput = (overrides?: Partial<RuleInput>): RuleInput => ({
    taxYear: 2024,
    userType: UserType.FREELANCER,
    registrationStatus: RegistrationStatus.REGISTERED,
    hasEmploymentIncome: false,
    incomeStreams: [],
    expenses: [],
    selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
    ...overrides,
  });

  describe('8% Flat Tax Computation', () => {
    it('should compute 8% tax on gross above 250K threshold', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
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

      // 8% of (500,000 - 250,000) = 8% of 250,000 = 20,000
      expect(result.estimatedTax).toBe(20000);
      expect(result.grossIncome).toBe(500000);
      expect(result.businessIncome).toBe(500000);
    });

    it('should return 0 tax if income is below 250K', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 200000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.estimatedTax).toBe(0);
    });

    it('should apply withholding credits correctly', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 500000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: true,
            withheldAmount: 15000,
            form2307Received: true,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.creditsApplied).toBe(15000);
      expect(result.netTaxPayable).toBe(20000 - 15000); // 5,000
    });
  });

  describe('Graduated Rates Computation', () => {
    it('should apply OSD (40%) when no expenses provided', () => {
      const input = createInput({
        selectedRegime: TaxRegime.GRADUATED_RATES,
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
        expenses: [],
      });

      const result = rule.execute(input);

      // OSD = 40% of 1,000,000 = 400,000
      // Taxable = 1,000,000 - 400,000 = 600,000
      // Tax on 600,000 using graduated rates
      expect(result.totalDeductions).toBe(0); // No itemized deductions
      expect(result.taxableIncome).toBeGreaterThan(0);
    });

    it('should use itemized deductions when higher than OSD', () => {
      const input = createInput({
        selectedRegime: TaxRegime.GRADUATED_RATES,
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
          { id: '2', category: 'UTILITIES' as any, amount: 150000, isDeductible: true },
          { id: '3', category: 'SUPPLIES' as any, amount: 100000, isDeductible: true },
        ],
      });

      const result = rule.execute(input);

      // Itemized = 550,000 > OSD of 400,000
      expect(result.totalDeductions).toBe(550000);
    });
  });

  describe('Quarterly Payment Breakdown', () => {
    it('should divide annual tax into quarterly payments', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 650000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      // 8% of (650,000 - 250,000) = 32,000
      const totalQuarterly =
        result.quarterlyPayments.q1 +
        result.quarterlyPayments.q2 +
        result.quarterlyPayments.q3 +
        result.quarterlyPayments.annual;

      expect(totalQuarterly).toBeCloseTo(result.netTaxPayable, 0);
    });
  });

  describe('Mixed Income Handling', () => {
    it('should separate business and employment income', () => {
      const input = createInput({
        userType: UserType.MIXED_INCOME,
        hasEmploymentIncome: true,
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.EMPLOYMENT,
            grossAmount: 600000,
            frequency: IncomeFrequency.MONTHLY,
            hasWithholding: true,
            withheldAmount: 60000,
            form2307Received: false,
          },
          {
            id: '2',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 400000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.grossIncome).toBe(1000000);
      expect(result.businessIncome).toBe(400000);
      expect(result.employmentIncome).toBe(600000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero income', () => {
      const input = createInput({
        incomeStreams: [],
      });

      const result = rule.execute(input);

      expect(result.grossIncome).toBe(0);
      expect(result.estimatedTax).toBe(0);
      expect(result.netTaxPayable).toBe(0);
    });

    it('should handle exactly 250K income (8%)', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 250000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: false,
            form2307Received: false,
          },
        ],
      });

      const result = rule.execute(input);

      expect(result.estimatedTax).toBe(0); // Exactly at threshold
    });

    it('should not allow negative tax payable', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 300000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: true,
            withheldAmount: 50000, // More than tax due
            form2307Received: true,
          },
        ],
      });

      const result = rule.execute(input);

      // Tax = 8% of 50,000 = 4,000
      // Credits = 50,000
      // Net should be 0, not negative
      expect(result.netTaxPayable).toBe(0);
    });
  });
});
