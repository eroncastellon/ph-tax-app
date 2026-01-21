import { Injectable } from '@nestjs/common';
import { RuleInput, RuleModule, Obligation, TaxRegime, UserType, RegistrationStatus, IncomeType } from '../types';

/**
 * FILING OBLIGATIONS RULE
 *
 * Determines which BIR forms the taxpayer must file based on their
 * user type, income sources, and selected tax regime.
 *
 * [CPA VALIDATION REQUIRED] Form requirements must be validated
 * against current BIR issuances.
 *
 * Legal Basis:
 * - NIRC as amended by TRAIN Law
 * - RR No. 8-2018 (8% Income Tax Option)
 * - RR No. 11-2018 (Withholding Tax)
 */
@Injectable()
export class FilingObligationsRule implements RuleModule {
  id = 'FILING_OBLIGATIONS';
  code = 'FILING_OBLIGATIONS_DETERMINATION';
  version = '1.0.0';
  title = 'Tax Filing Obligations Determination';

  execute(input: RuleInput): Obligation[] {
    const obligations: Obligation[] = [];
    let obligationCounter = 1;

    // Helper to generate unique IDs
    const nextId = () => `OBL-${obligationCounter++}`;

    // =========================================================================
    // INCOME TAX OBLIGATIONS
    // =========================================================================

    // Quarterly Income Tax (Form 1701Q)
    // [CPA VALIDATION REQUIRED]
    if (this.requiresQuarterlyIncomeTax(input)) {
      obligations.push({
        id: nextId(),
        formCode: '1701Q',
        formName: 'Quarterly Income Tax Return',
        description: 'For self-employed individuals, estates, and trusts',
        frequency: 'quarterly',
        isApplicable: true,
        ruleModuleId: this.id,
        notes: input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT
          ? 'File quarterly even under 8% regime. Report gross receipts and compute tax at 8%.'
          : 'Report income and compute tax using graduated rates with deductions.',
      });
    }

    // Annual Income Tax (Form 1701)
    // [CPA VALIDATION REQUIRED]
    obligations.push({
      id: nextId(),
      formCode: '1701',
      formName: 'Annual Income Tax Return',
      description: 'Annual income tax return for individuals',
      frequency: 'annual',
      isApplicable: true,
      ruleModuleId: this.id,
      notes: this.getAnnualReturnNotes(input),
    });

    // =========================================================================
    // PERCENTAGE TAX OBLIGATIONS (Non-VAT)
    // =========================================================================

    // Quarterly Percentage Tax (Form 2551Q)
    // [CPA VALIDATION REQUIRED] Only for non-VAT taxpayers using graduated rates
    if (this.requiresPercentageTax(input)) {
      obligations.push({
        id: nextId(),
        formCode: '2551Q',
        formName: 'Quarterly Percentage Tax Return',
        description: '3% percentage tax on gross sales/receipts (non-VAT)',
        frequency: 'quarterly',
        isApplicable: true,
        ruleModuleId: this.id,
        notes:
          '3% of gross sales/receipts. Required for non-VAT registered taxpayers using graduated rates. NOT required if using 8% flat tax option.',
      });
    } else if (input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT) {
      // Show as not applicable to explain why
      obligations.push({
        id: nextId(),
        formCode: '2551Q',
        formName: 'Quarterly Percentage Tax Return',
        description: '3% percentage tax on gross sales/receipts (non-VAT)',
        frequency: 'quarterly',
        isApplicable: false,
        ruleModuleId: this.id,
        notes: 'Not required because you elected 8% flat tax, which replaces percentage tax.',
      });
    }

    // =========================================================================
    // REGISTRATION OBLIGATIONS
    // =========================================================================

    // BIR Registration (Form 1901)
    if (input.registrationStatus === RegistrationStatus.NOT_REGISTERED) {
      obligations.push({
        id: nextId(),
        formCode: '1901',
        formName: 'Application for Registration (Self-Employed)',
        description: 'Initial BIR registration for self-employed individuals',
        frequency: 'annual', // One-time but tracked annually
        isApplicable: true,
        ruleModuleId: this.id,
        notes:
          'IMPORTANT: You must register with the BIR before starting business activities. This should be done within 30 days of starting business.',
      });
    }

    // Annual Registration Fee (Form 0605)
    if (input.registrationStatus === RegistrationStatus.REGISTERED) {
      obligations.push({
        id: nextId(),
        formCode: '0605',
        formName: 'Payment Form (Annual Registration Fee)',
        description: 'Annual registration fee of ₱500',
        frequency: 'annual',
        isApplicable: true,
        ruleModuleId: this.id,
        notes: '₱500 annual registration fee, due on or before January 31 each year.',
      });
    }

    // =========================================================================
    // WITHHOLDING TAX OBLIGATIONS
    // =========================================================================

    // Creditable Withholding Tax Certificate (Form 2307)
    const hasWithholding = input.incomeStreams.some((s) => s.hasWithholding);
    if (hasWithholding) {
      obligations.push({
        id: nextId(),
        formCode: '2307',
        formName: 'Certificate of Creditable Tax Withheld at Source',
        description: 'Certificate received from clients who withheld taxes',
        frequency: 'quarterly',
        isApplicable: true,
        ruleModuleId: this.id,
        notes:
          'You should receive Form 2307 from clients who withhold taxes from your payments. These are CREDITS that reduce your tax due. Keep all 2307s for filing.',
      });
    }

    // =========================================================================
    // EMPLOYMENT INCOME (Mixed Income)
    // =========================================================================

    if (input.hasEmploymentIncome) {
      // BIR Form 2316 (from employer)
      obligations.push({
        id: nextId(),
        formCode: '2316',
        formName: 'Certificate of Compensation Payment/Tax Withheld',
        description: 'Annual certificate from employer',
        frequency: 'annual',
        isApplicable: true,
        ruleModuleId: this.id,
        notes:
          'Your employer should provide this by January 31. You need this to file Form 1701 for mixed income.',
      });
    }

    // =========================================================================
    // BOOKS OF ACCOUNTS
    // =========================================================================

    // Not a form but an important compliance requirement
    if (
      input.userType !== UserType.MIXED_INCOME ||
      input.incomeStreams.some((s) => s.incomeType !== IncomeType.EMPLOYMENT)
    ) {
      obligations.push({
        id: nextId(),
        formCode: 'BOOKS',
        formName: 'Books of Accounts',
        description: 'Required record-keeping for business/professional income',
        frequency: 'annual',
        isApplicable: true,
        ruleModuleId: this.id,
        notes: input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT
          ? 'Under 8% regime, you may use simplified books (journal and ledger). Must be registered with BIR.'
          : 'Must maintain books of accounts (journal, ledger, cash receipts/disbursements). Required for itemized deductions.',
      });
    }

    return obligations;
  }

  /**
   * Determines if quarterly income tax filing is required
   */
  private requiresQuarterlyIncomeTax(input: RuleInput): boolean {
    // Self-employed, professionals, and mixed income must file quarterly
    const selfEmployedTypes = [
      UserType.FREELANCER,
      UserType.SELF_EMPLOYED,
      UserType.MICRO_SMALL_BUSINESS,
      UserType.MIXED_INCOME,
    ];

    return selfEmployedTypes.includes(input.userType);
  }

  /**
   * Determines if percentage tax (Form 2551Q) is required
   * [CPA VALIDATION REQUIRED]
   *
   * Percentage tax is NOT required if:
   * - Taxpayer elected 8% flat tax (replaces both income tax and percentage tax)
   * - Taxpayer is VAT-registered (pays VAT instead)
   */
  private requiresPercentageTax(input: RuleInput): boolean {
    // Not required under 8% regime
    if (input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT) {
      return false;
    }

    // Required for non-VAT businesses using graduated rates
    return (
      [UserType.FREELANCER, UserType.SELF_EMPLOYED, UserType.MICRO_SMALL_BUSINESS].includes(input.userType) &&
      input.selectedRegime === TaxRegime.GRADUATED_RATES
    );
  }

  /**
   * Get notes for annual return based on user type
   */
  private getAnnualReturnNotes(input: RuleInput): string {
    if (input.hasEmploymentIncome) {
      return 'As a mixed-income earner, you must file Form 1701 combining employment and business income. Attach Form 2316 from your employer.';
    }

    if (input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT) {
      return 'File annual return reporting total gross receipts. Final tax computation using 8% rate on amounts exceeding ₱250,000.';
    }

    return 'File annual return with final tax computation. Report all income and claim applicable deductions.';
  }

  getPlainLanguageExplanation() {
    return {
      summary: `This rule determines which BIR forms you need to file based on your income sources
        and tax regime. The main forms are: 1701Q (quarterly income tax), 1701 (annual income tax),
        and 2551Q (percentage tax, only if not using 8% option).`,

      forBeginners: `The BIR has different forms for different purposes. Don't worry about memorizing
        form numbers - this app will tell you exactly which forms to file and when. The key things
        to remember: (1) You'll file quarterly and annually, (2) Keep receipts from clients who
        deduct taxes from your payments (Form 2307), and (3) Keep records of your income and expenses.`,

      examples: [
        {
          scenario: 'Freelancer using 8% flat tax',
          outcome: 'File Form 1701Q quarterly and Form 1701 annually. No percentage tax (2551Q) needed.',
        },
        {
          scenario: 'Small business using graduated rates',
          outcome: 'File Form 1701Q (income tax) AND Form 2551Q (3% percentage tax) quarterly, plus annual Form 1701.',
        },
        {
          scenario: 'Employee with side freelancing',
          outcome:
            'File Form 1701Q quarterly for freelance income. Annual Form 1701 combines both employment (from 2316) and freelance income.',
        },
      ],
    };
  }
}
