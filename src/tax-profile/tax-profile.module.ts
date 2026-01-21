import { Module } from '@nestjs/common';
import { TaxProfileService } from './tax-profile.service';
import { TaxProfileController } from './tax-profile.controller';

@Module({
  controllers: [TaxProfileController],
  providers: [TaxProfileService],
  exports: [TaxProfileService],
})
export class TaxProfileModule {}
