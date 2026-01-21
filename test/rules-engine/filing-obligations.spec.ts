import { describe, it, expect, beforeEach } from 'vitest';
import { FilingObligationsRule } from '../../src/rules-engine/rules/filing-obligations.rule';
import {
  RuleInput,
  UserType,
  RegistrationStatus,
  TaxRegime,
  IncomeType,
  IncomeFrequency,
} from '../../src/rules-engine/types';

describe('FilingObligationsRule', () => {
  let rule: FilingObligationsRule;

  beforeEach(() => {
    rule = new FilingObligationsRule();
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

  describe('8% Flat Tax Regime', () => {
    it('should require 1701Q and 1701 but NOT 2551Q', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
      });

      const obligations = rule.execute(input);

      const formCodes = obligations.map((o) => o.formCode);

      expect(formCodes).toContain('1701Q');
      expect(formCodes).toContain('1701');

      // 2551Q should be present but NOT applicable
      const percentageTax = obligations.find((o) => o.formCode === '2551Q');
      expect(percentageTax?.isApplicable).toBe(false);
      expect(percentageTax?.notes).toContain('8% flat tax');
    });
  });

  describe('Graduated Rates Regime', () => {
    it('should require both income tax AND percentage tax', () => {
      const input = createInput({
        selectedRegime: TaxRegime.GRADUATED_RATES,
      });

      const obligations = rule.execute(input);

      const applicable = obligations.filter((o) => o.isApplicable);
      const formCodes = applicable.map((o) => o.formCode);

      expect(formCodes).toContain('1701Q');
      expect(formCodes).toContain('1701');
      expect(formCodes).toContain('2551Q');
    });
  });

  describe('Registration Status', () => {
    it('should require registration form when not registered', () => {
      const input = createInput({
        registrationStatus: RegistrationStatus.NOT_REGISTERED,
      });

      const obligations = rule.execute(input);

      const registration = obligations.find((o) => o.formCode === '1901');
      expect(registration).toBeDefined();
      expect(registration?.isApplicable).toBe(true);
    });

    it('should require annual registration fee when registered', () => {
      const input = createInput({
        registrationStatus: RegistrationStatus.REGISTERED,
      });

      const obligations = rule.execute(input);

      const regFee = obligations.find((o) => o.formCode === '0605');
      expect(regFee).toBeDefined();
      expect(regFee?.isApplicable).toBe(true);
      expect(regFee?.notes).toContain('500');
    });
  });

  describe('Mixed Income', () => {
    it('should include 2316 obligation for mixed income', () => {
      const input = createInput({
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
        ],
      });

      const obligations = rule.execute(input);

      const form2316 = obligations.find((o) => o.formCode === '2316');
      expect(form2316).toBeDefined();
      expect(form2316?.isApplicable).toBe(true);
      expect(form2316?.notes).toContain('employer');
    });

    it('should note mixed income in annual return', () => {
      const input = createInput({
        userType: UserType.MIXED_INCOME,
        hasEmploymentIncome: true,
      });

      const obligations = rule.execute(input);

      const annual = obligations.find((o) => o.formCode === '1701');
      expect(annual?.notes).toContain('mixed-income');
    });
  });

  describe('Withholding Tax', () => {
    it('should include 2307 tracking when income has withholding', () => {
      const input = createInput({
        incomeStreams: [
          {
            id: '1',
            incomeType: IncomeType.FREELANCE_SERVICE,
            grossAmount: 100000,
            frequency: IncomeFrequency.ONE_TIME,
            hasWithholding: true,
            withheldAmount: 5000,
            form2307Received: false,
          },
        ],
      });

      const obligations = rule.execute(input);

      const form2307 = obligations.find((o) => o.formCode === '2307');
      expect(form2307).toBeDefined();
      expect(form2307?.notes).toContain('credits');
    });
  });

  describe('Books of Accounts', () => {
    it('should require books for self-employed', () => {
      const input = createInput({
        userType: UserType.SELF_EMPLOYED,
      });

      const obligations = rule.execute(input);

      const books = obligations.find((o) => o.formCode === 'BOOKS');
      expect(books).toBeDefined();
      expect(books?.isApplicable).toBe(true);
    });

    it('should mention simplified books for 8% regime', () => {
      const input = createInput({
        selectedRegime: TaxRegime.EIGHT_PERCENT_FLAT,
      });

      const obligations = rule.execute(input);

      const books = obligations.find((o) => o.formCode === 'BOOKS');
      expect(books?.notes).toContain('simplified');
    });
  });

  describe('Obligation Metadata', () => {
    it('should include rule module ID for traceability', () => {
      const input = createInput();
      const obligations = rule.execute(input);

      obligations.forEach((o) => {
        expect(o.ruleModuleId).toBe('FILING_OBLIGATIONS');
      });
    });

    it('should include frequency for each obligation', () => {
      const input = createInput();
      const obligations = rule.execute(input);

      obligations.forEach((o) => {
        expect(['monthly', 'quarterly', 'annual']).toContain(o.frequency);
      });
    });
  });
});
