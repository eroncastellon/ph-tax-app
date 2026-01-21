import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { AssessmentService } from '../assessment/assessment.service';
import { TaxProfileService } from '../tax-profile/tax-profile.service';

/**
 * AI EXPLANATION LAYER
 *
 * CRITICAL: This layer is READ-ONLY for tax outcomes.
 *
 * The AI layer can ONLY:
 * 1. Explain rule modules and their outcomes
 * 2. Ask clarifying questions to improve data quality
 * 3. Summarize the reasoning receipt
 * 4. Provide beginner-friendly explanations
 *
 * The AI layer CANNOT:
 * - Modify any computed tax values
 * - Change filing obligations
 * - Alter deadlines
 * - Override risk flags
 * - Make tax decisions
 *
 * All explanations are based on the deterministic rules engine output.
 */
@Injectable()
export class AILayerService {
  private readonly logger = new Logger(AILayerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
    private readonly assessmentService: AssessmentService,
    private readonly taxProfileService: TaxProfileService,
  ) {}

  /**
   * Explain a specific rule module
   *
   * Returns plain-language explanation that can be enhanced by AI
   * for the specific user's context.
   */
  async explainRule(ruleModuleId: string, context?: ExplainRuleContext) {
    const explanation = this.rulesEngine.getRuleExplanation(ruleModuleId);

    if (!explanation) {
      throw new NotFoundException(`Rule module ${ruleModuleId} not found`);
    }

    // Log the request for audit
    await this.logExplanationRequest('explain_rule', ruleModuleId, context);

    return {
      ruleModuleId,
      ...explanation,
      contextualNotes: context ? this.getContextualNotes(ruleModuleId, context) : null,
      aiEnhancementPrompt: this.getAIEnhancementPrompt(ruleModuleId, context),
    };
  }

  /**
   * Generate clarifying questions based on data completeness
   *
   * Used when the rules engine identifies missing or unclear data.
   */
  async generateClarifyingQuestions(
    userId: string,
    taxProfileId: string,
  ): Promise<ClarifyingQuestion[]> {
    const assessment = await this.assessmentService.getLatestAssessment(userId, taxProfileId);

    if (!assessment) {
      return [
        {
          id: 'NO_ASSESSMENT',
          question: 'Would you like to run a tax assessment first?',
          context: 'No assessment has been run yet for this tax profile.',
          suggestedAction: 'Run POST /tax-profiles/{profileId}/assess',
          priority: 'high',
        },
      ];
    }

    const questions: ClarifyingQuestion[] = [];
    const receipt = assessment.reasoningReceipt as any;
    const riskFlags = assessment.riskFlags as any[];

    // Check completeness score
    if (receipt.completeness.score < 70) {
      for (const field of receipt.completeness.missingFields) {
        questions.push({
          id: `MISSING_${field.replace(/\s/g, '_').toUpperCase()}`,
          question: this.getMissingFieldQuestion(field),
          context: `This information helps provide more accurate tax guidance.`,
          suggestedAction: `Update your tax profile with ${field}`,
          priority: 'high',
        });
      }
    }

    // Check for warning-level risk flags that need clarification
    for (const flag of riskFlags.filter((f) => f.level === 'WARNING')) {
      if (flag.code === 'REGIME_NOT_SELECTED') {
        questions.push({
          id: 'REGIME_SELECTION',
          question:
            'Have you decided between the 8% flat tax option and graduated rates with deductions?',
          context:
            'This choice affects your tax computation. The assessment shows a comparison to help you decide.',
          suggestedAction: 'Review the regime comparison and update your tax profile',
          priority: 'high',
          relatedData: {
            regimeComparison: assessment.regimeComparison,
          },
        });
      }

      if (flag.code === 'MISSING_2307') {
        questions.push({
          id: 'FORM_2307_FOLLOWUP',
          question:
            'Have you requested Form 2307 certificates from clients who withheld taxes?',
          context:
            'Without Form 2307, you cannot claim withholding tax credits. These certificates are usually issued monthly or quarterly.',
          suggestedAction: 'Contact your clients to request Form 2307',
          priority: 'medium',
        });
      }
    }

    // Log the request
    await this.logExplanationRequest('clarifying_question', undefined, {
      taxProfileId,
      questionCount: questions.length,
    });

    return questions;
  }

  /**
   * Summarize the assessment reasoning for the user
   *
   * Provides a beginner-friendly summary of how the assessment was derived.
   */
  async summarizeReasoning(
    userId: string,
    taxProfileId: string,
    assessmentId?: string,
  ): Promise<ReasoningSummary> {
    let assessment;

    if (assessmentId) {
      assessment = await this.assessmentService.getAssessmentById(
        userId,
        taxProfileId,
        assessmentId,
      );
    } else {
      assessment = await this.assessmentService.getLatestAssessment(userId, taxProfileId);
    }

    if (!assessment) {
      throw new NotFoundException('No assessment found');
    }

    const receipt = assessment.reasoningReceipt as any;
    const computedValues = assessment.computedValues as any;
    const obligations = assessment.obligations as any[];
    const riskFlags = assessment.riskFlags as any[];

    // Build beginner-friendly summary
    const summary: ReasoningSummary = {
      assessmentId: assessment.id,
      version: assessment.version,
      assessedAt: assessment.assessedAt,

      overview: this.buildOverview(assessment.recommendedRegime, computedValues, obligations),

      stepByStepExplanation: receipt.steps.map((step: any) => ({
        step: step.stepNumber,
        title: this.getRuleTitle(step.ruleModuleId),
        whatWeDid: step.explanation,
        result: this.formatStepResult(step),
      })),

      keyNumbers: {
        grossIncome: computedValues.grossIncome,
        deductions: computedValues.totalDeductions,
        taxableIncome: computedValues.taxableIncome,
        estimatedTax: computedValues.estimatedTax,
        taxCredits: computedValues.creditsApplied,
        netTaxDue: computedValues.netTaxPayable,
      },

      whatYouNeedToDo: obligations
        .filter((o: any) => o.isApplicable)
        .map((o: any) => ({
          form: o.formCode,
          description: o.formName,
          frequency: o.frequency,
          notes: o.notes,
        })),

      thingsToWatch: riskFlags.map((flag: any) => ({
        severity: flag.level,
        issue: flag.title,
        explanation: flag.description,
        whatToDo: flag.recommendedAction,
      })),

      dataCompleteness: {
        score: receipt.completeness.score,
        missingItems: receipt.completeness.missingFields,
        suggestions: receipt.completeness.warnings,
      },

      disclaimer:
        'This summary is for guidance only. Tax rules are complex and may have exceptions. Always consult a licensed CPA before filing.',
    };

    // Log the request
    await this.logExplanationRequest('summarize_reasoning', undefined, {
      taxProfileId,
      assessmentId: assessment.id,
    });

    return summary;
  }

  /**
   * Get AI enhancement prompt for external AI processing
   *
   * This provides a structured prompt that can be sent to an AI service
   * to generate more personalized explanations. The AI response should
   * NEVER modify the actual tax values.
   */
  private getAIEnhancementPrompt(ruleModuleId: string, context?: ExplainRuleContext): string {
    return `
You are a helpful tax guidance assistant for Philippine taxpayers.

CRITICAL CONSTRAINTS:
- You can ONLY explain and clarify. You cannot change any tax calculations.
- All numbers and obligations come from the deterministic rules engine.
- If asked to change calculations, politely decline and explain that changes must be made through the data input.

Your task: Explain the ${ruleModuleId} rule to a beginner.

${context ? `User context: ${JSON.stringify(context)}` : ''}

Focus on:
1. Why this rule exists
2. How it affects the user's tax situation
3. Common mistakes to avoid
4. Next steps if any action is needed
    `.trim();
  }

  /**
   * Get contextual notes based on user's situation
   */
  private getContextualNotes(
    ruleModuleId: string,
    context: ExplainRuleContext,
  ): string | null {
    // Add contextual notes based on the rule and user situation
    const notes: Record<string, (ctx: ExplainRuleContext) => string | null> = {
      REGIME_DETERMINATION: (ctx) => {
        if (ctx.grossIncome && ctx.grossIncome > 3000000) {
          return 'Note: Your gross income exceeds ₱3M, making you VAT-registered. The 8% option is not available.';
        }
        if (ctx.expenses && ctx.grossIncome && ctx.expenses / ctx.grossIncome > 0.5) {
          return 'Note: Your expenses are high relative to income. Graduated rates with deductions may save you money.';
        }
        return null;
      },
      FILING_OBLIGATIONS: (ctx) => {
        if (ctx.hasEmploymentIncome) {
          return 'Note: As a mixed-income earner, you need to combine employment and business income in your annual return.';
        }
        return null;
      },
    };

    const noteFn = notes[ruleModuleId];
    return noteFn ? noteFn(context) : null;
  }

  /**
   * Get question for missing field
   */
  private getMissingFieldQuestion(field: string): string {
    const questions: Record<string, string> = {
      'TIN (Tax Identification Number)':
        'What is your Tax Identification Number (TIN)? This is needed for all BIR filings.',
      'Income streams':
        'What are your sources of income this year? Please add at least one income stream.',
    };

    return questions[field] || `Could you provide your ${field}?`;
  }

  /**
   * Build overview paragraph
   */
  private buildOverview(
    regime: string,
    computedValues: any,
    obligations: any[],
  ): string {
    const regimeText =
      regime === 'EIGHT_PERCENT_FLAT'
        ? '8% flat tax on gross receipts'
        : 'graduated income tax rates with deductions';

    const applicableCount = obligations.filter((o) => o.isApplicable).length;

    return `Based on your income and expenses, we recommend using the ${regimeText}. ` +
      `Your estimated tax for the year is ₱${computedValues.netTaxPayable.toLocaleString()}. ` +
      `You have ${applicableCount} filing obligation(s) to track.`;
  }

  /**
   * Get rule title from ID
   */
  private getRuleTitle(ruleModuleId: string): string {
    const titles: Record<string, string> = {
      REGIME_DETERMINATION: 'Choosing Your Tax Option',
      TAX_COMPUTATION: 'Calculating Your Tax',
      FILING_OBLIGATIONS: 'Identifying What to File',
      DEADLINE_CALCULATION: 'Setting Your Deadlines',
      RISK_ASSESSMENT: 'Checking for Issues',
    };

    return titles[ruleModuleId] || ruleModuleId;
  }

  /**
   * Format step result for display
   */
  private formatStepResult(step: any): string {
    const output = step.output;
    const key = Object.keys(output)[0];
    const value = output[key];

    if (typeof value === 'number') {
      return `₱${value.toLocaleString()}`;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }

  /**
   * Log explanation request for audit
   */
  private async logExplanationRequest(
    requestType: string,
    ruleModuleId?: string,
    contextData?: any,
  ): Promise<void> {
    // In production, this would log to the AIExplanationRequest table
    this.logger.log(
      `AI Layer request: ${requestType}` +
        (ruleModuleId ? ` for ${ruleModuleId}` : ''),
    );

    // Note: Actual database logging would be:
    // await this.prisma.aIExplanationRequest.create({
    //   data: {
    //     userId,
    //     requestType,
    //     ruleModuleId,
    //     contextData,
    //     aiResponse: '', // Filled later if using external AI
    //     didModifyOutcome: false, // Should ALWAYS be false
    //   },
    // });
  }
}

// Type definitions

interface ExplainRuleContext {
  userType?: string;
  grossIncome?: number;
  expenses?: number;
  hasEmploymentIncome?: boolean;
  selectedRegime?: string;
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
  relatedData?: any;
}

interface ReasoningSummary {
  assessmentId: string;
  version: number;
  assessedAt: Date;
  overview: string;
  stepByStepExplanation: Array<{
    step: number;
    title: string;
    whatWeDid: string;
    result: string;
  }>;
  keyNumbers: {
    grossIncome: number;
    deductions: number;
    taxableIncome: number;
    estimatedTax: number;
    taxCredits: number;
    netTaxDue: number;
  };
  whatYouNeedToDo: Array<{
    form: string;
    description: string;
    frequency: string;
    notes: string;
  }>;
  thingsToWatch: Array<{
    severity: string;
    issue: string;
    explanation: string;
    whatToDo: string;
  }>;
  dataCompleteness: {
    score: number;
    missingItems: string[];
    suggestions: string[];
  };
  disclaimer: string;
}
