import { Injectable } from '@nestjs/common';
import {
  RuleInput,
  RuleModule,
  RiskFlag,
  RiskLevel,
  RegistrationStatus,
  TaxRegime,
  UserType,
  TAX_THRESHOLDS,
  IncomeType,
} from '../types';

/**
 * RISK ASSESSMENT RULE
 *
 * Identifies potential compliance issues, data quality problems,
 * and situations requiring professional CPA review.
 *
 * Risk Levels:
 * - NONE: All good
 * - INFO: Nice to know, no action needed
 * - WARNING: User should review/consider
 * - CPA_REVIEW_REQUIRED: Professional consultation strongly recommended
 */
@Injectable()
export class RiskAssessmentRule implements RuleModule {
  id = 'RISK_ASSESSMENT';
  code = 'RISK_ASSESS';
  version = '1.0.0';
  title = 'Tax Risk Assessment';

  execute(input: RuleInput): RiskFlag[] {
    const flags: RiskFlag[] = [];
    let flagCounter = 1;

    const nextId = () => `RISK-${flagCounter++}`;

    // =========================================================================
    // REGISTRATION STATUS RISKS
    // =========================================================================

    if (input.registrationStatus === RegistrationStatus.NOT_REGISTERED) {
      const businessIncome = input.incomeStreams
        .filter((s) => s.incomeType !== IncomeType.EMPLOYMENT)
        .reduce((sum, s) => sum + s.grossAmount, 0);

      if (businessIncome > 0) {
        flags.push({
          id: nextId(),
          level: RiskLevel.CPA_REVIEW_REQUIRED,
          code: 'UNREG_WITH_INCOME',
          title: 'Operating Without BIR Registration',
          description: `You have reported business/professional income of ₱${businessIncome.toLocaleString()} but are not registered with the BIR. This may have legal and tax implications.`,
          ruleModuleId: this.id,
          recommendedAction:
            'Register with the BIR immediately. Consult a CPA to assess any back taxes, penalties, or amnesty programs that may apply to your situation.',
          affectedFields: ['registrationStatus', 'tin'],
        });
      }
    }

    if (input.registrationStatus === RegistrationStatus.NEEDS_UPDATE) {
      flags.push({
        id: nextId(),
        level: RiskLevel.WARNING,
        code: 'REG_NEEDS_UPDATE',
        title: 'BIR Registration Needs Updating',
        description:
          'Your BIR registration may need updating. This could affect your tax filing requirements.',
        ruleModuleId: this.id,
        recommendedAction:
          'Visit your RDO to update your registration. Common updates include: change of address, change of line of business, or updating from employee to self-employed status.',
        affectedFields: ['registrationStatus', 'rdo'],
      });
    }

    // =========================================================================
    // INCOME THRESHOLD RISKS
    // =========================================================================

    const totalGrossReceipts = input.incomeStreams
      .filter((s) => s.incomeType !== IncomeType.EMPLOYMENT)
      .reduce((sum, s) => sum + s.grossAmount, 0);

    // Approaching VAT threshold
    if (
      totalGrossReceipts >= TAX_THRESHOLDS.VAT_THRESHOLD * 0.8 &&
      totalGrossReceipts < TAX_THRESHOLDS.VAT_THRESHOLD
    ) {
      flags.push({
        id: nextId(),
        level: RiskLevel.WARNING,
        code: 'APPROACHING_VAT_THRESHOLD',
        title: 'Approaching VAT Registration Threshold',
        description: `Your gross receipts (₱${totalGrossReceipts.toLocaleString()}) are approaching the ₱3,000,000 VAT threshold. Once exceeded, you must register for VAT.`,
        ruleModuleId: this.id,
        recommendedAction:
          'Monitor your income closely. If you expect to exceed ₱3M, consult a CPA about VAT registration requirements and timing.',
        affectedFields: ['incomeStreams'],
      });
    }

    // Exceeded VAT threshold
    if (totalGrossReceipts > TAX_THRESHOLDS.VAT_THRESHOLD) {
      flags.push({
        id: nextId(),
        level: RiskLevel.CPA_REVIEW_REQUIRED,
        code: 'EXCEEDS_VAT_THRESHOLD',
        title: 'Gross Receipts Exceed VAT Threshold',
        description: `Your gross receipts (₱${totalGrossReceipts.toLocaleString()}) exceed the ₱3,000,000 VAT threshold. This app currently does not support VAT workflows.`,
        ruleModuleId: this.id,
        recommendedAction:
          'IMPORTANT: You are required to register for VAT. Consult a CPA immediately for proper VAT compliance, which includes different filing requirements and rates.',
        affectedFields: ['incomeStreams', 'selectedRegime'],
      });
    }

    // =========================================================================
    // WITHHOLDING TAX RISKS
    // =========================================================================

    const streamsWithWithholding = input.incomeStreams.filter((s) => s.hasWithholding);
    const streamsWithout2307 = streamsWithWithholding.filter((s) => !s.form2307Received);

    if (streamsWithout2307.length > 0) {
      const totalWithheld = streamsWithout2307.reduce((sum, s) => sum + (s.withheldAmount || 0), 0);
      flags.push({
        id: nextId(),
        level: RiskLevel.WARNING,
        code: 'MISSING_2307',
        title: 'Missing Form 2307 Certificates',
        description: `You have ${streamsWithout2307.length} income source(s) with withholding taxes (₱${totalWithheld.toLocaleString()}) but no Form 2307 received. Without 2307, you cannot claim these as tax credits.`,
        ruleModuleId: this.id,
        recommendedAction:
          'Request Form 2307 certificates from your clients/payors. These are usually issued within the month following payment. Keep them for filing and audit purposes.',
        affectedFields: ['incomeStreams'],
      });
    }

    // Unusually high withholding
    const totalWithheld = streamsWithWithholding.reduce((sum, s) => sum + (s.withheldAmount || 0), 0);
    const effectiveWithholdingRate = totalGrossReceipts > 0 ? totalWithheld / totalGrossReceipts : 0;

    if (effectiveWithholdingRate > 0.15 && totalWithheld > 50000) {
      flags.push({
        id: nextId(),
        level: RiskLevel.INFO,
        code: 'HIGH_WITHHOLDING',
        title: 'High Withholding Tax Rate',
        description: `Your effective withholding rate is ${(effectiveWithholdingRate * 100).toFixed(1)}%. This may result in a tax refund or credit.`,
        ruleModuleId: this.id,
        recommendedAction:
          'Verify that clients are using the correct withholding rate for your income type. You may be entitled to a refund if overwithholding occurred.',
        affectedFields: ['incomeStreams'],
      });
    }

    // =========================================================================
    // REGIME SELECTION RISKS
    // =========================================================================

    if (input.selectedRegime === TaxRegime.UNDETERMINED) {
      flags.push({
        id: nextId(),
        level: RiskLevel.WARNING,
        code: 'REGIME_NOT_SELECTED',
        title: 'Tax Regime Not Yet Selected',
        description:
          'You have not selected between 8% flat tax and graduated rates. This selection affects your tax computation and filing obligations.',
        ruleModuleId: this.id,
        recommendedAction:
          'Review the regime comparison and select your preferred option. Once selected and filed, this cannot be changed for the tax year.',
        affectedFields: ['selectedRegime'],
      });
    }

    // 8% regime but high expenses
    if (input.selectedRegime === TaxRegime.EIGHT_PERCENT_FLAT) {
      const totalDeductions = input.expenses.filter((e) => e.isDeductible).reduce((sum, e) => sum + e.amount, 0);
      const expenseRatio = totalGrossReceipts > 0 ? totalDeductions / totalGrossReceipts : 0;

      if (expenseRatio > 0.5) {
        flags.push({
          id: nextId(),
          level: RiskLevel.INFO,
          code: '8PCT_HIGH_EXPENSES',
          title: 'High Expenses with 8% Flat Tax',
          description: `Your expenses are ${(expenseRatio * 100).toFixed(0)}% of gross receipts. With the 8% flat tax, you cannot deduct these expenses. Graduated rates might result in lower tax.`,
          ruleModuleId: this.id,
          recommendedAction:
            'Review the regime comparison. If you have not yet filed your first quarterly return for the year, you may still switch to graduated rates.',
          affectedFields: ['selectedRegime', 'expenses'],
        });
      }
    }

    // =========================================================================
    // DATA QUALITY RISKS
    // =========================================================================

    // No income recorded
    if (input.incomeStreams.length === 0) {
      flags.push({
        id: nextId(),
        level: RiskLevel.WARNING,
        code: 'NO_INCOME_RECORDED',
        title: 'No Income Streams Recorded',
        description: 'No income has been recorded for this tax year. Add your income sources to generate an accurate assessment.',
        ruleModuleId: this.id,
        recommendedAction: 'Add your income streams, including amounts and whether withholding tax was deducted.',
        affectedFields: ['incomeStreams'],
      });
    }

    // Mixed income without employment declaration
    if (
      input.userType === UserType.MIXED_INCOME &&
      !input.hasEmploymentIncome &&
      !input.incomeStreams.some((s) => s.incomeType === IncomeType.EMPLOYMENT)
    ) {
      flags.push({
        id: nextId(),
        level: RiskLevel.WARNING,
        code: 'MIXED_NO_EMPLOYMENT',
        title: 'Mixed Income Type Without Employment Income',
        description:
          'You selected "Mixed Income" as your user type but have not recorded any employment income.',
        ruleModuleId: this.id,
        recommendedAction:
          'Either add your employment income details or change your user type if you no longer have employment income.',
        affectedFields: ['userType', 'hasEmploymentIncome', 'incomeStreams'],
      });
    }

    // Large income without receipts/documentation
    if (totalGrossReceipts > 500000) {
      const hasAnyDocs = input.incomeStreams.some(
        (s) => s.form2307Received || s.hasWithholding,
      );
      if (!hasAnyDocs) {
        flags.push({
          id: nextId(),
          level: RiskLevel.INFO,
          code: 'LARGE_INCOME_NO_DOCS',
          title: 'Consider Documenting Income Sources',
          description:
            'Your income exceeds ₱500,000 with no withholding certificates indicated. Ensure you have proper documentation.',
          ruleModuleId: this.id,
          recommendedAction:
            'Keep official receipts, invoices, and contracts for all income. These serve as evidence in case of BIR audit.',
          affectedFields: ['incomeStreams'],
        });
      }
    }

    // =========================================================================
    // EXPENSE DOCUMENTATION RISKS
    // =========================================================================

    if (input.selectedRegime === TaxRegime.GRADUATED_RATES && input.expenses.length > 0) {
      const expensesWithoutReceipts = input.expenses.filter((e) => e.isDeductible); // Assuming no receipt field tracked in input
      // This would need the actual expense data with receipt tracking

      flags.push({
        id: nextId(),
        level: RiskLevel.INFO,
        code: 'EXPENSE_DOCS_REMINDER',
        title: 'Keep Expense Documentation',
        description:
          'You are using graduated rates with itemized deductions. All deductible expenses must be supported by official receipts.',
        ruleModuleId: this.id,
        recommendedAction:
          'Ensure you have Official Receipts (OR) or Sales Invoices (SI) for all business expenses. The BIR may disallow deductions without proper documentation.',
        affectedFields: ['expenses'],
      });
    }

    return flags;
  }

  getPlainLanguageExplanation() {
    return {
      summary: `The risk assessment identifies potential issues with your tax situation that
        may require attention or professional consultation. Issues range from informational
        notes to situations requiring CPA review.`,

      forBeginners: `This is like a health check for your tax situation. Green means all good.
        Yellow means "heads up, you should look at this." Red means "this is serious, you
        should talk to a professional accountant." Always address red flags before filing.`,

      examples: [
        {
          scenario: 'Earning ₱2.8M approaching VAT threshold',
          outcome: 'Warning flag: Approaching VAT threshold. Monitor income and prepare for potential VAT registration.',
        },
        {
          scenario: 'Not registered with BIR but earning income',
          outcome: 'CPA Review Required: Must register immediately. Potential back taxes and penalties may apply.',
        },
      ],
    };
  }
}
