import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaxProfileService } from '../tax-profile/tax-profile.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { RuleInput, UserType, RegistrationStatus, TaxRegime, IncomeType, IncomeFrequency, ExpenseCategory } from '../rules-engine/types';
import { AssessmentResult } from '@prisma/client';

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxProfileService: TaxProfileService,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  /**
   * Run a full tax assessment for a tax profile
   *
   * This is the main entry point for generating tax guidance.
   * It gathers all data, runs the rules engine, and stores the result.
   */
  async runAssessment(userId: string, taxProfileId: string): Promise<AssessmentResult> {
    this.logger.log(`Running assessment for profile ${taxProfileId}`);

    // Get the tax profile with all related data
    const profile = await this.prisma.taxProfile.findFirst({
      where: {
        id: taxProfileId,
        userId,
      },
      include: {
        incomeStreams: true,
        expenses: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Tax profile not found');
    }

    // Mark any previous assessments as stale
    await this.prisma.assessmentResult.updateMany({
      where: {
        taxProfileId,
        isStale: false,
      },
      data: {
        isStale: true,
      },
    });

    // Build input for rules engine
    const ruleInput: RuleInput = {
      taxYear: profile.taxYear,
      userType: profile.userType as UserType,
      registrationStatus: profile.registrationStatus as RegistrationStatus,
      hasEmploymentIncome: profile.hasEmploymentIncome,
      selectedRegime: profile.selectedRegime as TaxRegime,
      tin: profile.tin || undefined,
      incomeStreams: profile.incomeStreams.map((stream) => ({
        id: stream.id,
        incomeType: stream.incomeType as IncomeType,
        grossAmount: Number(stream.grossAmount),
        frequency: stream.frequency as IncomeFrequency,
        hasWithholding: stream.hasWithholding,
        withheldAmount: stream.withheldAmount ? Number(stream.withheldAmount) : undefined,
        withholdingRate: stream.withholdingRate ? Number(stream.withholdingRate) : undefined,
        form2307Received: stream.form2307Received,
      })),
      expenses: profile.expenses.map((expense) => ({
        id: expense.id,
        category: expense.category as ExpenseCategory,
        amount: Number(expense.amount),
        isDeductible: expense.isDeductible,
      })),
    };

    // Run the rules engine
    const assessmentOutput = await this.rulesEngine.runAssessment(ruleInput);

    // Get previous assessment version
    const previousAssessment = await this.prisma.assessmentResult.findFirst({
      where: { taxProfileId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (previousAssessment?.version || 0) + 1;

    // Store the assessment result
    const result = await this.prisma.assessmentResult.create({
      data: {
        taxProfileId,
        version: newVersion,
        rulesEngineVersion: assessmentOutput.rulesEngineVersion,
        recommendedRegime: assessmentOutput.recommendedRegime,
        regimeComparison: assessmentOutput.regimeComparison as any,
        computedValues: assessmentOutput.computedValues as any,
        obligations: assessmentOutput.obligations as any,
        deadlines: assessmentOutput.deadlines as any,
        riskFlags: assessmentOutput.riskFlags as any,
        reasoningReceipt: assessmentOutput.reasoningReceipt as any,
        isStale: false,
      },
    });

    // Update previous assessment with supersededBy
    if (previousAssessment) {
      await this.prisma.assessmentResult.update({
        where: { id: previousAssessment.id },
        data: { supersededBy: result.id },
      });
    }

    this.logger.log(`Assessment complete: ${result.id} (v${newVersion})`);

    return result;
  }

  /**
   * Get the latest assessment for a tax profile
   */
  async getLatestAssessment(userId: string, taxProfileId: string): Promise<AssessmentResult | null> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    return this.prisma.assessmentResult.findFirst({
      where: {
        taxProfileId,
        isStale: false,
      },
      orderBy: { assessedAt: 'desc' },
    });
  }

  /**
   * Get all assessments for a tax profile (history)
   */
  async getAssessmentHistory(userId: string, taxProfileId: string): Promise<AssessmentResult[]> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    return this.prisma.assessmentResult.findMany({
      where: { taxProfileId },
      orderBy: { assessedAt: 'desc' },
    });
  }

  /**
   * Get a specific assessment by ID
   */
  async getAssessmentById(
    userId: string,
    taxProfileId: string,
    assessmentId: string,
  ): Promise<AssessmentResult> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    const assessment = await this.prisma.assessmentResult.findFirst({
      where: {
        id: assessmentId,
        taxProfileId,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  /**
   * Get upcoming deadlines across all tax profiles for a user
   */
  async getUpcomingDeadlines(userId: string, daysAhead: number = 30) {
    const profiles = await this.prisma.taxProfile.findMany({
      where: { userId },
      include: {
        assessmentResults: {
          where: { isStale: false },
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
      },
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const allDeadlines: Array<{
      taxYear: number;
      profileId: string;
      deadline: any;
    }> = [];

    for (const profile of profiles) {
      const assessment = profile.assessmentResults[0];
      if (!assessment) continue;

      const deadlines = assessment.deadlines as any[];
      for (const deadline of deadlines) {
        if (deadline.dueDate === 'ASAP') {
          allDeadlines.push({
            taxYear: profile.taxYear,
            profileId: profile.id,
            deadline: { ...deadline, isUrgent: true },
          });
        } else {
          const dueDate = new Date(deadline.dueDate);
          if (dueDate <= cutoffDate && dueDate >= new Date()) {
            allDeadlines.push({
              taxYear: profile.taxYear,
              profileId: profile.id,
              deadline,
            });
          }
        }
      }
    }

    // Sort by due date
    allDeadlines.sort((a, b) => {
      if (a.deadline.dueDate === 'ASAP') return -1;
      if (b.deadline.dueDate === 'ASAP') return 1;
      return new Date(a.deadline.dueDate).getTime() - new Date(b.deadline.dueDate).getTime();
    });

    return {
      daysAhead,
      count: allDeadlines.length,
      deadlines: allDeadlines,
    };
  }

  /**
   * Get risk flags across all tax profiles for a user
   */
  async getAllRiskFlags(userId: string) {
    const profiles = await this.prisma.taxProfile.findMany({
      where: { userId },
      include: {
        assessmentResults: {
          where: { isStale: false },
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
      },
    });

    const allFlags: Array<{
      taxYear: number;
      profileId: string;
      flag: any;
    }> = [];

    for (const profile of profiles) {
      const assessment = profile.assessmentResults[0];
      if (!assessment) continue;

      const flags = assessment.riskFlags as any[];
      for (const flag of flags) {
        allFlags.push({
          taxYear: profile.taxYear,
          profileId: profile.id,
          flag,
        });
      }
    }

    // Sort by severity (CPA_REVIEW_REQUIRED first)
    const severityOrder = { CPA_REVIEW_REQUIRED: 0, WARNING: 1, INFO: 2, NONE: 3 };
    allFlags.sort(
      (a, b) => (severityOrder[a.flag.level as keyof typeof severityOrder] || 3) - (severityOrder[b.flag.level as keyof typeof severityOrder] || 3),
    );

    return {
      count: allFlags.length,
      criticalCount: allFlags.filter((f) => f.flag.level === 'CPA_REVIEW_REQUIRED').length,
      warningCount: allFlags.filter((f) => f.flag.level === 'WARNING').length,
      flags: allFlags,
    };
  }
}
