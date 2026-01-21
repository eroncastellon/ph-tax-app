import { Injectable } from '@nestjs/common';
import {
  RuleInput,
  RuleModule,
  ComputedValues,
  TaxRegime,
  IncomeType,
  TAX_THRESHOLDS,
  GRADUATED_TAX_BRACKETS_2023,
} from '../types';

/**
 * TAX COMPUTATION RULE
 *
 * Computes actual tax amounts based on income, expenses, and selected regime.
 * Provides form-ready values and quarterly payment breakdown.
 *
 * [CPA VALIDATION REQUIRED] All computations must be validated against
 * BIR requirements and current tax regulations.
 *
 * Legal Basis:
 * - NIRC as amended by TRAIN Law
 * - RR No. 8-2018 (8% Income Tax Option)
 */
@Injectable()
export class TaxComputationRule implements RuleModule {
  id = 'TAX_COMPUTATION';
  code = 'TAX_COMPUTE';
  version = '1.0.0';
  title = 'Tax Computation Engine';

  execute(input: RuleInput): ComputedValues {
    // Calculate income components
    const grossIncome = this.calculateGrossIncome(input);
    const businessIncome = this.calculateBusinessIncome(input);
    const employmentIncome = this.calculateEmploymentIncome(input);
    const totalDeductions = this.calculateTotalDeductions(input);

    // Calculate creditable withholding taxes
    const creditsApplied = this.calculateWithholdingCredits(input);

    // Compute tax based on regime
    let estimatedTax: number;
    let taxableIncome: number;

    if (input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT) {
      // 8% Flat Tax Computation
      // [CPA VALIDATION REQUIRED]
      const result = this.compute8PercentTax(businessIncome);
      estimatedTax = result.tax;
      taxableIncome = result.taxableAmount;
    } else {
      // Graduated Rates Computation
      // [CPA VALIDATION REQUIRED]
      const result = this.computeGraduatedTax(businessIncome, totalDeductions, employmentIncome);
      estimatedTax = result.tax;
      taxableIncome = result.taxableIncome;
    }

    // Net tax payable after credits
    const netTaxPayable = Math.max(0, estimatedTax - creditsApplied);

    // Calculate quarterly payments
    const quarterlyPayments = this.calculateQuarterlyPayments(netTaxPayable, input.selectedRegime);

    return {
      grossIncome,
      businessIncome,
      employmentIncome,
      totalDeductions,
      taxableIncome,
      estimatedTax,
      creditsApplied,
      netTaxPayable,
      quarterlyPayments,
    };
  }

  /**
   * Calculate total gross income from all sources
   */
  private calculateGrossIncome(input: RuleInput): number {
    return input.incomeStreams.reduce((sum, stream) => sum + stream.grossAmount, 0);
  }

  /**
   * Calculate business/professional income (non-employment)
   */
  private calculateBusinessIncome(input: RuleInput): number {
    return input.incomeStreams
      .filter((stream) => stream.incomeType !== IncomeType.EMPLOYMENT)
      .reduce((sum, stream) => sum + stream.grossAmount, 0);
  }

  /**
   * Calculate employment income (for mixed income)
   */
  private calculateEmploymentIncome(input: RuleInput): number {
    return input.incomeStreams
      .filter((stream) => stream.incomeType === IncomeType.EMPLOYMENT)
      .reduce((sum, stream) => sum + stream.grossAmount, 0);
  }

  /**
   * Calculate total deductible expenses
   * [CPA VALIDATION REQUIRED] Deductibility rules
   */
  private calculateTotalDeductions(input: RuleInput): number {
    return input.expenses.filter((exp) => exp.isDeductible).reduce((sum, exp) => sum + exp.amount, 0);
  }

  /**
   * Calculate creditable withholding tax from all income streams
   */
  private calculateWithholdingCredits(input: RuleInput): number {
    return input.incomeStreams
      .filter((stream) => stream.hasWithholding && stream.withheldAmount)
      .reduce((sum, stream) => sum + (stream.withheldAmount || 0), 0);
  }

  /**
   * Compute tax under 8% flat regime
   * [CPA VALIDATION REQUIRED]
   *
   * Formula: 8% × (Gross Receipts − ₱250,000)
   * Note: Employment income is taxed separately via withholding
   */
  private compute8PercentTax(businessIncome: number): { tax: number; taxableAmount: number } {
    // First ₱250,000 is exempt
    const taxableAmount = Math.max(0, businessIncome - TAX_THRESHOLDS.PERSONAL_EXEMPTION_THRESHOLD);
    const tax = taxableAmount * TAX_THRESHOLDS.EIGHT_PERCENT_RATE;

    return { tax, taxableAmount };
  }

  /**
   * Compute tax under graduated rates
   * [CPA VALIDATION REQUIRED]
   *
   * Uses Optional Standard Deduction (40%) or Itemized Deductions,
   * whichever results in lower tax.
   */
  private computeGraduatedTax(
    businessIncome: number,
    actualDeductions: number,
    employmentIncome: number,
  ): { tax: number; taxableIncome: number; deductionMethod: string } {
    // Calculate OSD (40% of gross business income only)
    const osd = businessIncome * TAX_THRESHOLDS.OSD_RATE;

    // Determine better deduction method
    const useOSD = osd >= actualDeductions;
    const deduction = useOSD ? osd : actualDeductions;
    const deductionMethod = useOSD ? 'Optional Standard Deduction (40%)' : 'Itemized Deductions';

    // Taxable business income = Gross - Deductions
    const taxableBusinessIncome = Math.max(0, businessIncome - deduction);

    // For mixed income, employment income is already net (after employer withholding)
    // But we need to report gross for bracket determination
    // Employment income: taxed via withholding by employer
    // Here we compute additional tax if any

    // Total taxable income for bracket determination
    // [CPA VALIDATION REQUIRED] Mixed income computation rules
    const totalTaxableIncome = taxableBusinessIncome;
    // Note: Employment income is typically handled separately
    // This is simplified - actual mixed income computation is more complex

    // Apply graduated rates
    const tax = this.applyGraduatedRates(totalTaxableIncome);

    return { tax, taxableIncome: totalTaxableIncome, deductionMethod };
  }

  /**
   * Apply graduated tax brackets
   * [CPA VALIDATION REQUIRED] Based on TRAIN Law
   */
  private applyGraduatedRates(taxableIncome: number): number {
    for (const bracket of GRADUATED_TAX_BRACKETS_2023) {
      if (taxableIncome <= bracket.max) {
        const excessAmount = Math.max(0, taxableIncome - bracket.min);
        return bracket.baseTax + excessAmount * bracket.rate;
      }
    }

    // Highest bracket
    const lastBracket = GRADUATED_TAX_BRACKETS_2023[GRADUATED_TAX_BRACKETS_2023.length - 1];
    const excessAmount = taxableIncome - lastBracket.min;
    return lastBracket.baseTax + excessAmount * lastBracket.rate;
  }

  /**
   * Calculate quarterly payment schedule
   * [CPA VALIDATION REQUIRED]
   *
   * For 8% flat: Divide annual tax by 4
   * For graduated: Cumulative quarterly payments
   */
  private calculateQuarterlyPayments(
    annualTax: number,
    regime?: TaxRegime,
  ): ComputedValues['quarterlyPayments'] {
    // Simplified: Equal quarterly payments
    // [CPA VALIDATION REQUIRED] Actual computation is cumulative

    const quarterlyAmount = annualTax / 4;

    return {
      q1: Math.round(quarterlyAmount * 100) / 100,
      q2: Math.round(quarterlyAmount * 100) / 100,
      q3: Math.round(quarterlyAmount * 100) / 100,
      annual: Math.round((annualTax - quarterlyAmount * 3) * 100) / 100, // True-up
    };
  }

  getPlainLanguageExplanation() {
    return {
      summary: `Tax computation depends on your chosen regime. Under 8% flat tax, you pay
        8% of gross receipts above ₱250,000. Under graduated rates, you deduct expenses
        from income and apply progressive tax brackets (0% to 35% depending on income level).`,

      forBeginners: `Your tax is calculated based on how much you earn and how much you spend
        on business. If you use the simple 8% option, just multiply your earnings (minus ₱250,000)
        by 0.08. If you use the detailed option, subtract your business expenses first, then
        use a tax table. The app does all the math for you and shows both options so you can
        pick the one that saves you more money.`,

      examples: [
        {
          scenario: 'Freelancer with ₱800,000 gross, using 8% flat tax',
          outcome:
            'Taxable: ₱800,000 - ₱250,000 = ₱550,000. Tax: ₱550,000 × 8% = ₱44,000. Quarterly: ~₱11,000 each.',
        },
        {
          scenario: 'Freelancer with ₱800,000 gross, ₱400,000 expenses, using graduated rates',
          outcome:
            'Using OSD (40% = ₱320,000) vs Itemized (₱400,000). Itemized is better. Taxable: ₱400,000. Tax: ₱22,500 + 20% of excess. Total: ~₱32,500.',
        },
      ],
    };
  }
}
