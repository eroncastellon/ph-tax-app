import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AILayerService } from './ai-layer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { ExplainRuleDto } from './dto/explain-rule.dto';

@ApiTags('ai-explain')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AILayerController {
  constructor(private readonly aiService: AILayerService) {}

  @Post('explain/rule/:ruleId')
  @ApiOperation({
    summary: 'Explain a tax rule',
    description: `Get a beginner-friendly explanation of a specific tax rule module.

**Important:** The AI layer can only EXPLAIN rules. It cannot modify any tax calculations.

Available rules:
- REGIME_DETERMINATION: 8% flat tax vs graduated rates
- TAX_COMPUTATION: How tax is calculated
- FILING_OBLIGATIONS: What forms to file
- DEADLINE_CALCULATION: When things are due
- RISK_ASSESSMENT: Potential issues to watch`,
  })
  @ApiParam({
    name: 'ruleId',
    description: 'Rule module ID',
    example: 'REGIME_DETERMINATION',
  })
  @ApiResponse({
    status: 200,
    description: 'Rule explanation',
  })
  async explainRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: ExplainRuleDto,
  ) {
    return this.aiService.explainRule(ruleId, dto.context);
  }

  @Get('questions/:profileId')
  @ApiOperation({
    summary: 'Get clarifying questions',
    description: `Get questions that would help improve the tax assessment.

These questions are generated based on:
- Missing or incomplete data
- Warning-level risk flags
- Data quality issues

Use these to guide users in providing better information.`,
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'List of clarifying questions',
  })
  async getClarifyingQuestions(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ) {
    const questions = await this.aiService.generateClarifyingQuestions(
      user.id,
      profileId,
    );

    return {
      count: questions.length,
      questions,
      note: 'Answering these questions will help provide more accurate tax guidance.',
    };
  }

  @Get('summary/:profileId')
  @ApiOperation({
    summary: 'Get reasoning summary',
    description: `Get a beginner-friendly summary of the tax assessment.

This explains:
- How the tax was calculated step-by-step
- Key numbers in plain language
- What you need to do (filing obligations)
- Things to watch out for (risk flags)

Perfect for users who want to understand their tax situation without diving into the raw data.`,
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiQuery({
    name: 'assessmentId',
    required: false,
    description: 'Specific assessment ID (defaults to latest)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reasoning summary',
  })
  async getReasoningSummary(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Query('assessmentId') assessmentId?: string,
  ) {
    return this.aiService.summarizeReasoning(user.id, profileId, assessmentId);
  }

  @Get('terms/:term')
  @ApiOperation({
    summary: 'Explain a tax term',
    description: 'Get a simple explanation of common Philippine tax terms.',
  })
  @ApiParam({
    name: 'term',
    description: 'Tax term to explain',
    example: 'TIN',
  })
  @ApiResponse({
    status: 200,
    description: 'Term explanation',
  })
  async explainTerm(@Param('term') term: string) {
    const terms: Record<string, { term: string; explanation: string; example?: string }> = {
      TIN: {
        term: 'TIN (Tax Identification Number)',
        explanation:
          'Your unique 12-digit number assigned by the BIR. Format: XXX-XXX-XXX-XXX. Everyone who earns income in the Philippines needs one.',
        example: '123-456-789-000',
      },
      RDO: {
        term: 'RDO (Revenue District Office)',
        explanation:
          'The BIR office that handles your tax affairs. Your RDO is based on your place of residence or business. All filings and payments go through your assigned RDO.',
      },
      CWT: {
        term: 'CWT (Creditable Withholding Tax)',
        explanation:
          'Tax that your clients/employers deduct from your payment and remit to the BIR on your behalf. You receive Form 2307 as proof, which you can use to reduce your tax due.',
      },
      OSD: {
        term: 'OSD (Optional Standard Deduction)',
        explanation:
          '40% of your gross income that you can claim as a deduction without itemizing expenses. Simpler than tracking actual expenses, but may result in higher tax if your real expenses exceed 40%.',
      },
      TRAIN: {
        term: 'TRAIN Law',
        explanation:
          'Tax Reform for Acceleration and Inclusion. The law that revised Philippine tax rates in 2018, including the 8% flat tax option for self-employed individuals.',
      },
      '8_PERCENT': {
        term: '8% Flat Tax Option',
        explanation:
          'A simplified tax option for self-employed individuals with gross receipts up to ₱3M. Pay 8% of gross receipts exceeding ₱250K instead of graduated rates + percentage tax.',
      },
      PERCENTAGE_TAX: {
        term: 'Percentage Tax',
        explanation:
          '3% tax on gross sales/receipts for non-VAT registered businesses. If you choose the 8% flat tax option, you don\'t pay this separately - it\'s included in the 8%.',
      },
      '1701': {
        term: 'Form 1701',
        explanation:
          'Annual Income Tax Return for Individuals. Filed every April 15 for the previous year\'s income. Self-employed and mixed-income earners use this form.',
      },
      '1701Q': {
        term: 'Form 1701Q',
        explanation:
          'Quarterly Income Tax Return. Filed 3 times a year (May, August, November) to report income and pay estimated taxes quarterly.',
      },
      '2551Q': {
        term: 'Form 2551Q',
        explanation:
          'Quarterly Percentage Tax Return. For non-VAT businesses paying the 3% percentage tax. Not needed if you use the 8% flat tax option.',
      },
      '2307': {
        term: 'Form 2307',
        explanation:
          'Certificate of Creditable Tax Withheld at Source. Given to you by clients who withheld tax from your payment. Keep these - you need them to claim tax credits!',
      },
    };

    const termKey = term.toUpperCase().replace(/ /g, '_');
    const explanation = terms[termKey];

    if (!explanation) {
      return {
        term,
        found: false,
        suggestion: 'Try: TIN, RDO, CWT, OSD, TRAIN, 8_PERCENT, PERCENTAGE_TAX, 1701, 1701Q, 2551Q, 2307',
      };
    }

    return {
      found: true,
      ...explanation,
    };
  }
}
