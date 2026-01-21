import { Module } from '@nestjs/common';
import { RulesEngineService } from './rules-engine.service';
import { RulesController } from './rules.controller';
import { RegimeDeterminationRule } from './rules/regime-determination.rule';
import { FilingObligationsRule } from './rules/filing-obligations.rule';
import { DeadlineCalculationRule } from './rules/deadline-calculation.rule';
import { TaxComputationRule } from './rules/tax-computation.rule';
import { RiskAssessmentRule } from './rules/risk-assessment.rule';

@Module({
  controllers: [RulesController],
  providers: [
    RulesEngineService,
    RegimeDeterminationRule,
    FilingObligationsRule,
    DeadlineCalculationRule,
    TaxComputationRule,
    RiskAssessmentRule,
  ],
  exports: [RulesEngineService],
})
export class RulesEngineModule {}
