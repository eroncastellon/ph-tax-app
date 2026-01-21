import { Injectable } from '@nestjs/common';
import {
  RuleInput,
  RuleModule,
  RegimeComparisonResult,
  TaxRegime,
  UserType,
  TAX_THRESHOLDS,
  GRADUATED_TAX_BRACKETS_2023,
  IncomeType,
} from '../types';

/**
 * REGIME DETERMINATION RULE
 *
 * Determines eligibility for 8% flat tax vs graduated rates
 * and provides a comparison to help users choose.
 *
 * [CPA VALIDATION REQUIRED] All eligibility criteria and calculations
 * must be validated against current BIR regulations.
 *
 * Legal Basis:
 * - TRAIN Law (RA 10963) Section 24(A)(2)(b)
 * - Revenue Regulations No. 8-2018
 */
@Injectable()
export class RegimeDeterminationRule implements RuleModule {
  id = 'REGIME_DETERMINATION';
  code = 'REGIME_8PCT_ELIGIBILITY';
  version = '1.0.0';
  title = '8% Flat Tax Eligibility Determination';

  execute(input: RuleInput): RegimeComparisonResult {
    const eligible8Percent = this.checkEligibility(input);
    const businessIncome = this.calculateBusinessIncome(input);
    const totalDeductions = this.calculateTotalDeductions(input);

    // Calculate tax under both regimes
    const eightPercentTax = this.calculate8PercentTax(businessIncome);
    const graduatedTax = this.calculateGraduatedTax(businessIncome, totalDeductions);

    const comparison = {
      eightPercent: {
        estimatedTax: eligible8Percent.isEligible ? eightPercentTax : 0,
        effectiveRate: businessIncome > 0 ? eightPercentTax / businessIncome : 0,
        pros: [
          'Simpler computation - just 8% of gross receipts above ₱250,000',
          'No need to track itemized deductions',
          'Less bookkeeping requirements',
          'Replaces percentage tax and income tax',
        ],
        cons: [
          'Cannot claim business expenses as deductions',
          'May pay more tax if expenses are high (above 40% of gross)',
          'Fixed rate regardless of actual profitability',
          'Not available if gross exceeds ₱3,000,000',
        ],
      },
      graduatedRates: {
        estimatedTax: graduatedTax,
        effectiveRate: businessIncome > 0 ? graduatedTax / businessIncome : 0,
        pros: [
          'Can deduct actual business expenses',
          'May result in lower tax if expenses are high',
          'Progressive rates favor lower income',
          'More accurate reflection of actual profit',
        ],
        cons: [
          'Requires detailed expense tracking with receipts',
          'More complex tax computation',
          'Subject to both income tax AND percentage tax (3%)',
          'Higher compliance burden',
        ],
      },
    };

    // Determine recommendation
    let recommendation: TaxRegime;
    let recommendationReason: string;

    if (!eligible8Percent.isEligible) {
      recommendation = TaxRegime.GRADUATED_RATES;
      recommendationReason = `8% option not available: ${eligible8Percent.reason}`;
    } else if (totalDeductions / businessIncome > 0.4) {
      // If expenses exceed 40% of gross, graduated rates likely better
      recommendation = TaxRegime.GRADUATED_RATES;
      recommendationReason =
        'Your expenses appear high relative to income. Graduated rates with itemized deductions may result in lower tax.';
    } else if (eightPercentTax < graduatedTax) {
      recommendation = TaxRegime.EIGHT_PERCENT_FLAT;
      recommendationReason =
        'Based on your income and expenses, 8% flat tax would result in lower tax liability with simpler compliance.';
    } else {
      recommendation = TaxRegime.GRADUATED_RATES;
      recommendationReason =
        'Based on your income and deductible expenses, graduated rates would result in lower tax liability.';
    }

    return {
      eligible8Percent: eligible8Percent.isEligible,
      eligibilityReason: eligible8Percent.reason,
      comparison,
      recommendation,
      recommendationReason,
      ruleModuleId: this.id,
    };
  }

  /**
   * Check eligibility for 8% flat tax
   * [CPA VALIDATION REQUIRED]
   */
  private checkEligibility(input: RuleInput): { isEligible: boolean; reason: string } {
    const businessIncome = this.calculateBusinessIncome(input);

    // Rule 1: Must be registered as self-employed or professional
    const eligibleUserTypes = [UserType.FREELANCER, UserType.SELF_EMPLOYED, UserType.MICRO_SMALL_BUSINESS];

    if (!eligibleUserTypes.includes(input.userType)) {
      return {
        isEligible: false,
        reason: 'Only self-employed individuals, freelancers, and sole proprietors can elect 8% tax.',
      };
    }

    // Rule 2: Gross receipts must not exceed ₱3,000,000
    if (businessIncome > TAX_THRESHOLDS.VAT_THRESHOLD) {
      return {
        isEligible: false,
        reason: `Gross receipts/sales exceed ₱${TAX_THRESHOLDS.VAT_THRESHOLD.toLocaleString()}. You are VAT-registered and cannot use 8% flat tax.`,
      };
    }

    // Rule 3: For mixed income, only business portion qualifies
    if (input.userType === UserType.MIXED_INCOME || input.hasEmploymentIncome) {
      // Mixed income CAN use 8% for business income, but employment income
      // is taxed separately via withholding
      return {
        isEligible: true,
        reason:
          'Eligible for 8% flat tax on business/professional income. Employment income will be taxed separately through withholding.',
      };
    }

    return {
      isEligible: true,
      reason: 'You meet all requirements for 8% flat tax on gross sales/receipts.',
    };
  }

  /**
   * Calculate business income (non-employment)
   */
  private calculateBusinessIncome(input: RuleInput): number {
    return input.incomeStreams
      .filter((stream) => stream.incomeType !== IncomeType.EMPLOYMENT)
      .reduce((sum, stream) => sum + stream.grossAmount, 0);
  }

  /**
   * Calculate total deductible expenses
   */
  private calculateTotalDeductions(input: RuleInput): number {
    return input.expenses.filter((exp) => exp.isDeductible).reduce((sum, exp) => sum + exp.amount, 0);
  }

  /**
   * Calculate tax under 8% regime
   * [CPA VALIDATION REQUIRED]
   *
   * Formula: 8% of (Gross Receipts - ₱250,000)
   * The first ₱250,000 is exempt under TRAIN Law
   */
  private calculate8PercentTax(businessIncome: number): number {
    const taxableAmount = Math.max(0, businessIncome - TAX_THRESHOLDS.PERSONAL_EXEMPTION_THRESHOLD);
    return taxableAmount * TAX_THRESHOLDS.EIGHT_PERCENT_RATE;
  }

  /**
   * Calculate tax under graduated rates
   * [CPA VALIDATION REQUIRED]
   *
   * Uses either:
   * - Itemized Deductions (actual expenses), OR
   * - Optional Standard Deduction (40% of gross)
   *
   * Chooses whichever results in lower tax
   */
  private calculateGraduatedTax(businessIncome: number, actualDeductions: number): number {
    // Calculate OSD (40% of gross)
    const osd = businessIncome * TAX_THRESHOLDS.OSD_RATE;

    // Use whichever deduction is higher (results in lower tax)
    const bestDeduction = Math.max(actualDeductions, osd);

    // Taxable income = Gross - Deductions
    const taxableIncome = Math.max(0, businessIncome - bestDeduction);

    // Apply graduated rates
    return this.applyGraduatedRates(taxableIncome);
  }

  /**
   * Apply graduated tax brackets
   * [CPA VALIDATION REQUIRED] Based on TRAIN Law rates
   */
  private applyGraduatedRates(taxableIncome: number): number {
    for (const bracket of GRADUATED_TAX_BRACKETS_2023) {
      if (taxableIncome <= bracket.max) {
        const excessAmount = Math.max(0, taxableIncome - bracket.min);
        return bracket.baseTax + excessAmount * bracket.rate;
      }
    }

    // Should never reach here, but fallback to highest bracket
    const lastBracket = GRADUATED_TAX_BRACKETS_2023[GRADUATED_TAX_BRACKETS_2023.length - 1];
    const excessAmount = taxableIncome - lastBracket.min;
    return lastBracket.baseTax + excessAmount * lastBracket.rate;
  }

  getPlainLanguageExplanation() {
    return {
      summary: `The 8% flat tax option allows eligible self-employed individuals and professionals
        to pay a simple 8% tax on gross receipts above ₱250,000, instead of the regular graduated
        income tax rates plus 3% percentage tax. This option is only available if your annual
        gross receipts don't exceed ₱3,000,000.`,

      forBeginners: `Think of it like choosing between two ways to pay tax:
        (1) The simple way - pay 8% of everything you earn above ₱250,000, no math needed.
        (2) The detailed way - track all your business expenses, subtract them from income,
        then use a tax table. The simple way is easier but might cost more if you have lots
        of expenses. The app will show you which option saves you more money.`,

      examples: [
        {
          scenario: 'Freelancer earning ₱600,000/year with ₱150,000 in expenses',
          outcome:
            '8% tax: ₱28,000 (8% of ₱350,000). Graduated: ₱25,000 (after 40% OSD). Graduated rates are slightly better.',
        },
        {
          scenario: 'Small business owner earning ₱500,000/year with ₱50,000 expenses',
          outcome:
            '8% tax: ₱20,000. Graduated: ₱22,500 (after 40% OSD). 8% option saves ₱2,500 and is simpler.',
        },
      ],
    };
  }
}
