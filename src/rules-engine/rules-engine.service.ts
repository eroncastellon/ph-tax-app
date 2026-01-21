import { Injectable, Logger } from '@nestjs/common';
import { RegimeDeterminationRule } from './rules/regime-determination.rule';
import { FilingObligationsRule } from './rules/filing-obligations.rule';
import { DeadlineCalculationRule } from './rules/deadline-calculation.rule';
import { TaxComputationRule } from './rules/tax-computation.rule';
import { RiskAssessmentRule } from './rules/risk-assessment.rule';
import {
  RuleInput,
  AssessmentOutput,
  ReasoningReceipt,
  ReasoningStep,
  TaxRegime,
} from './types';

/**
 * RULES ENGINE SERVICE
 *
 * Orchestrates all rule modules to produce a complete tax assessment.
 * This is a DETERMINISTIC engine - given the same input, it always produces
 * the same output.
 *
 * The AI layer CANNOT modify outputs from this engine. It can only:
 * 1. Explain the rules and their outcomes
 * 2. Ask clarifying questions to improve input data
 * 3. Summarize the reasoning receipt
 */
@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);
  private readonly VERSION = '1.0.0';

  constructor(
    private readonly regimeRule: RegimeDeterminationRule,
    private readonly obligationsRule: FilingObligationsRule,
    private readonly deadlineRule: DeadlineCalculationRule,
    private readonly computationRule: TaxComputationRule,
    private readonly riskRule: RiskAssessmentRule,
  ) {}

  /**
   * Execute full assessment pipeline
   *
   * This is the main entry point for tax assessment. It runs all rules
   * in sequence and produces a complete assessment output.
   */
  async runAssessment(input: RuleInput): Promise<AssessmentOutput> {
    this.logger.log(`Running assessment for tax year ${input.taxYear}`);

    const reasoningSteps: ReasoningStep[] = [];
    let stepNumber = 1;

    // Step 1: Regime Determination
    this.logger.debug('Step 1: Regime determination');
    const regimeComparison = this.regimeRule.execute(input);
    reasoningSteps.push({
      stepNumber: stepNumber++,
      ruleModuleId: this.regimeRule.id,
      ruleModuleVersion: this.regimeRule.version,
      input: {
        userType: input.userType,
        grossIncome: input.incomeStreams.reduce((s, i) => s + i.grossAmount, 0),
        hasEmploymentIncome: input.hasEmploymentIncome,
      },
      output: {
        eligible8Percent: regimeComparison.eligible8Percent,
        recommendation: regimeComparison.recommendation,
      },
      explanation: regimeComparison.recommendationReason,
    });

    // Determine regime to use for subsequent calculations
    const effectiveRegime = input.selectedRegime !== TaxRegime.UNDETERMINED
      ? input.selectedRegime
      : regimeComparison.recommendation;

    // Create input with effective regime for other rules
    const effectiveInput: RuleInput = {
      ...input,
      selectedRegime: effectiveRegime,
    };

    // Step 2: Tax Computation
    this.logger.debug('Step 2: Tax computation');
    const computedValues = this.computationRule.execute(effectiveInput);
    reasoningSteps.push({
      stepNumber: stepNumber++,
      ruleModuleId: this.computationRule.id,
      ruleModuleVersion: this.computationRule.version,
      input: {
        regime: effectiveRegime,
        grossIncome: computedValues.grossIncome,
        deductions: computedValues.totalDeductions,
      },
      output: {
        taxableIncome: computedValues.taxableIncome,
        estimatedTax: computedValues.estimatedTax,
        netTaxPayable: computedValues.netTaxPayable,
      },
      explanation: `Tax computed using ${effectiveRegime === TaxRegime.EIGHT_PERCENT_FLAT ? '8% flat rate' : 'graduated rates with deductions'}.`,
    });

    // Step 3: Filing Obligations
    this.logger.debug('Step 3: Filing obligations');
    const obligations = this.obligationsRule.execute(effectiveInput);
    reasoningSteps.push({
      stepNumber: stepNumber++,
      ruleModuleId: this.obligationsRule.id,
      ruleModuleVersion: this.obligationsRule.version,
      input: {
        userType: input.userType,
        regime: effectiveRegime,
        hasEmploymentIncome: input.hasEmploymentIncome,
      },
      output: {
        applicableObligations: obligations.filter((o) => o.isApplicable).map((o) => o.formCode),
        totalObligations: obligations.length,
      },
      explanation: `Identified ${obligations.filter((o) => o.isApplicable).length} applicable filing obligations.`,
    });

    // Step 4: Deadline Calculation
    this.logger.debug('Step 4: Deadline calculation');
    const deadlines = this.deadlineRule.execute(effectiveInput, obligations);
    reasoningSteps.push({
      stepNumber: stepNumber++,
      ruleModuleId: this.deadlineRule.id,
      ruleModuleVersion: this.deadlineRule.version,
      input: {
        taxYear: input.taxYear,
        obligations: obligations.filter((o) => o.isApplicable).map((o) => o.formCode),
      },
      output: {
        totalDeadlines: deadlines.length,
        nextDeadline: deadlines[0]?.dueDate || 'None',
      },
      explanation: `Calculated ${deadlines.length} filing deadlines for tax year ${input.taxYear}.`,
    });

    // Step 5: Risk Assessment
    this.logger.debug('Step 5: Risk assessment');
    const riskFlags = this.riskRule.execute(effectiveInput);
    reasoningSteps.push({
      stepNumber: stepNumber++,
      ruleModuleId: this.riskRule.id,
      ruleModuleVersion: this.riskRule.version,
      input: {
        registrationStatus: input.registrationStatus,
        totalIncome: computedValues.grossIncome,
        hasWithholding: input.incomeStreams.some((s) => s.hasWithholding),
      },
      output: {
        totalFlags: riskFlags.length,
        criticalFlags: riskFlags.filter((f) => f.level === 'CPA_REVIEW_REQUIRED').length,
        warningFlags: riskFlags.filter((f) => f.level === 'WARNING').length,
      },
      explanation: `Identified ${riskFlags.length} risk flags, including ${riskFlags.filter((f) => f.level === 'CPA_REVIEW_REQUIRED').length} requiring CPA review.`,
    });

    // Build reasoning receipt
    const reasoningReceipt: ReasoningReceipt = {
      steps: reasoningSteps,
      explanationIds: reasoningSteps.map((s) => `${s.ruleModuleId}_v${s.ruleModuleVersion}`),
      completeness: this.assessCompleteness(input),
    };

    const output: AssessmentOutput = {
      recommendedRegime: effectiveRegime,
      regimeComparison,
      computedValues,
      obligations,
      deadlines,
      riskFlags,
      reasoningReceipt,
      rulesEngineVersion: this.VERSION,
    };

    this.logger.log(
      `Assessment complete: ${effectiveRegime}, Tax: ₱${computedValues.netTaxPayable.toLocaleString()}, ` +
        `Obligations: ${obligations.filter((o) => o.isApplicable).length}, ` +
        `Risks: ${riskFlags.length}`,
    );

    return output;
  }

  /**
   * Get explanation for a specific rule module
   */
  getRuleExplanation(ruleModuleId: string) {
    const ruleMap: Record<string, any> = {
      [this.regimeRule.id]: this.regimeRule,
      [this.obligationsRule.id]: this.obligationsRule,
      [this.deadlineRule.id]: this.deadlineRule,
      [this.computationRule.id]: this.computationRule,
      [this.riskRule.id]: this.riskRule,
    };

    const rule = ruleMap[ruleModuleId];
    if (!rule) {
      return null;
    }

    return {
      id: rule.id,
      code: rule.code,
      version: rule.version,
      title: rule.title,
      ...rule.getPlainLanguageExplanation(),
    };
  }

  /**
   * Get all available rule explanations
   */
  getAllRuleExplanations() {
    return [
      this.getRuleExplanation(this.regimeRule.id),
      this.getRuleExplanation(this.obligationsRule.id),
      this.getRuleExplanation(this.deadlineRule.id),
      this.getRuleExplanation(this.computationRule.id),
      this.getRuleExplanation(this.riskRule.id),
    ].filter(Boolean);
  }

  /**
   * Assess data completeness
   */
  private assessCompleteness(input: RuleInput): ReasoningReceipt['completeness'] {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!input.tin) {
      missingFields.push('TIN (Tax Identification Number)');
    }

    if (input.incomeStreams.length === 0) {
      missingFields.push('Income streams');
    }

    // Check for data quality issues
    if (input.selectedRegime === TaxRegime.UNDETERMINED) {
      warnings.push('Tax regime not selected - using recommended regime');
    }

    const hasWithholdingWithout2307 = input.incomeStreams.some(
      (s) => s.hasWithholding && !s.form2307Received,
    );
    if (hasWithholdingWithout2307) {
      warnings.push('Some withholding taxes lack Form 2307 documentation');
    }

    // Calculate completeness score
    const totalChecks = 10;
    const passedChecks = totalChecks - missingFields.length - warnings.length * 0.5;
    const score = Math.max(0, Math.min(100, (passedChecks / totalChecks) * 100));

    return {
      score: Math.round(score),
      missingFields,
      warnings,
    };
  }

  /**
   * Get engine version
   */
  getVersion(): string {
    return this.VERSION;
  }
}
