import { Module } from '@nestjs/common';
import { AILayerService } from './ai-layer.service';
import { AILayerController } from './ai-layer.controller';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { TaxProfileModule } from '../tax-profile/tax-profile.module';

@Module({
  imports: [RulesEngineModule, AssessmentModule, TaxProfileModule],
  controllers: [AILayerController],
  providers: [AILayerService],
  exports: [AILayerService],
})
export class AILayerModule {}
