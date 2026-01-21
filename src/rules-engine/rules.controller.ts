import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RulesEngineService } from './rules-engine.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('rules')
@Controller('rules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RulesController {
  constructor(private readonly rulesService: RulesEngineService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all rule module explanations',
    description: 'Returns plain-language explanations for all tax rule modules used in the assessment engine.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all rule modules with explanations',
  })
  getAllRules() {
    return {
      version: this.rulesService.getVersion(),
      rules: this.rulesService.getAllRuleExplanations(),
    };
  }

  @Get(':ruleId')
  @ApiOperation({
    summary: 'Get explanation for a specific rule module',
    description: 'Returns detailed plain-language explanation for a specific rule module.',
  })
  @ApiParam({
    name: 'ruleId',
    description: 'Rule module ID (e.g., REGIME_DETERMINATION, TAX_COMPUTATION)',
    example: 'REGIME_DETERMINATION',
  })
  @ApiResponse({
    status: 200,
    description: 'Rule module explanation',
  })
  @ApiResponse({
    status: 404,
    description: 'Rule module not found',
  })
  getRuleById(@Param('ruleId') ruleId: string) {
    const rule = this.rulesService.getRuleExplanation(ruleId);
    if (!rule) {
      return {
        error: 'Rule not found',
        availableRules: this.rulesService.getAllRuleExplanations().map((r: any) => r.id),
      };
    }
    return rule;
  }

  @Get('version/current')
  @ApiOperation({
    summary: 'Get current rules engine version',
  })
  @ApiResponse({
    status: 200,
    description: 'Current engine version',
  })
  getVersion() {
    return {
      version: this.rulesService.getVersion(),
      disclaimer:
        '[CPA VALIDATION REQUIRED] All tax rules in this system require validation by a licensed CPA before production use.',
    };
  }
}
