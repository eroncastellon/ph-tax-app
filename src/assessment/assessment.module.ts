import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { TaxProfileModule } from '../tax-profile/tax-profile.module';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';

@Module({
  imports: [TaxProfileModule, RulesEngineModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
