import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TaxProfileModule } from './tax-profile/tax-profile.module';
import { IncomeModule } from './income/income.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AssessmentModule } from './assessment/assessment.module';
import { RulesEngineModule } from './rules-engine/rules-engine.module';
import { AILayerModule } from './ai-layer/ai-layer.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TaxProfileModule,
    IncomeModule,
    ExpensesModule,
    AssessmentModule,
    RulesEngineModule,
    AILayerModule,
  ],
})
export class AppModule {}
