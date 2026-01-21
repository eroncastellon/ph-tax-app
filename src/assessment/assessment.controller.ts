import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('assessment')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('tax-profiles/:profileId/assess')
  @ApiOperation({
    summary: 'Run tax assessment',
    description: `Runs the full tax assessment for a tax profile.

This will:
1. Analyze all income streams and expenses
2. Determine optimal tax regime (8% flat vs graduated)
3. Calculate estimated tax liability
4. Identify filing obligations and deadlines
5. Flag any risks or issues requiring attention

**Important:** Previous assessments will be marked as stale.
Re-run assessment whenever income, expenses, or profile settings change.`,
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 201,
    description: 'Assessment completed successfully',
  })
  async runAssessment(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ) {
    const result = await this.assessmentService.runAssessment(user.id, profileId);

    return {
      id: result.id,
      version: result.version,
      assessedAt: result.assessedAt,
      rulesEngineVersion: result.rulesEngineVersion,
      recommendedRegime: result.recommendedRegime,
      regimeComparison: result.regimeComparison,
      computedValues: result.computedValues,
      obligations: result.obligations,
      deadlines: result.deadlines,
      riskFlags: result.riskFlags,
      reasoningReceipt: result.reasoningReceipt,
      disclaimer:
        '[CPA VALIDATION REQUIRED] This assessment is for guidance only. Consult a licensed CPA for official tax advice.',
    };
  }

  @Get('tax-profiles/:profileId/assessment')
  @ApiOperation({
    summary: 'Get latest assessment',
    description: 'Returns the most recent non-stale assessment for a tax profile.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Latest assessment result',
  })
  @ApiResponse({
    status: 404,
    description: 'No assessment found - run assessment first',
  })
  async getLatestAssessment(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ) {
    const result = await this.assessmentService.getLatestAssessment(user.id, profileId);

    if (!result) {
      return {
        message: 'No assessment found. Run POST /tax-profiles/{profileId}/assess to generate one.',
        hasAssessment: false,
      };
    }

    return {
      hasAssessment: true,
      ...result,
      disclaimer:
        '[CPA VALIDATION REQUIRED] This assessment is for guidance only. Consult a licensed CPA for official tax advice.',
    };
  }

  @Get('tax-profiles/:profileId/assessment/history')
  @ApiOperation({
    summary: 'Get assessment history',
    description: 'Returns all assessments for a tax profile, including stale ones.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment history',
  })
  async getAssessmentHistory(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ) {
    const results = await this.assessmentService.getAssessmentHistory(user.id, profileId);

    return {
      count: results.length,
      assessments: results.map((r) => ({
        id: r.id,
        version: r.version,
        assessedAt: r.assessedAt,
        isStale: r.isStale,
        supersededBy: r.supersededBy,
        recommendedRegime: r.recommendedRegime,
        // Only include summary data for history
        summary: {
          computedValues: r.computedValues,
          obligationCount: (r.obligations as any[]).filter((o: any) => o.isApplicable).length,
          riskFlagCount: (r.riskFlags as any[]).length,
        },
      })),
    };
  }

  @Get('tax-profiles/:profileId/assessment/:assessmentId')
  @ApiOperation({
    summary: 'Get specific assessment',
    description: 'Returns a specific assessment by ID.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assessment details',
  })
  async getAssessmentById(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    const result = await this.assessmentService.getAssessmentById(
      user.id,
      profileId,
      assessmentId,
    );

    return {
      ...result,
      disclaimer:
        '[CPA VALIDATION REQUIRED] This assessment is for guidance only. Consult a licensed CPA for official tax advice.',
    };
  }

  @Get('deadlines')
  @ApiOperation({
    summary: 'Get upcoming deadlines',
    description: 'Returns upcoming tax filing deadlines across all tax profiles.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look ahead (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming deadlines',
  })
  async getUpcomingDeadlines(
    @CurrentUser() user: CurrentUserData,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 30;
    return this.assessmentService.getUpcomingDeadlines(user.id, daysAhead);
  }

  @Get('risk-flags')
  @ApiOperation({
    summary: 'Get all risk flags',
    description: 'Returns all risk flags across all tax profiles, sorted by severity.',
  })
  @ApiResponse({
    status: 200,
    description: 'Risk flags',
  })
  async getAllRiskFlags(@CurrentUser() user: CurrentUserData) {
    return this.assessmentService.getAllRiskFlags(user.id);
  }
}
