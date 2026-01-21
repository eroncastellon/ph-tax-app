import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateIncomeDto {
  @ApiProperty({
    description: `Type of income. The app uses this to determine tax treatment.

- FREELANCE_SERVICE: Professional fees, consulting, project-based work
- BUSINESS_SALES: Sales from your business
- EMPLOYMENT: Salary/wages (for mixed-income earners)
- RENTAL: Income from renting out property
- ROYALTIES: Royalties, commissions
- OTHER: Other income sources`,
    enum: ['FREELANCE_SERVICE', 'BUSINESS_SALES', 'EMPLOYMENT', 'RENTAL', 'ROYALTIES', 'OTHER'],
    example: 'FREELANCE_SERVICE',
  })
  @IsEnum(['FREELANCE_SERVICE', 'BUSINESS_SALES', 'EMPLOYMENT', 'RENTAL', 'ROYALTIES', 'OTHER'])
  incomeType: string;

  @ApiProperty({
    description: 'Gross amount received (before any deductions)',
    example: 50000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  grossAmount: number;

  @ApiPropertyOptional({
    description: 'Description of the income source',
    example: 'Web development project for XYZ Company',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Name of client/payer',
    example: 'XYZ Company Inc.',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'How often you receive this income',
    enum: ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'IRREGULAR'],
    default: 'ONE_TIME',
  })
  @IsOptional()
  @IsEnum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'IRREGULAR'])
  frequency?: string;

  @ApiPropertyOptional({
    description: 'Start of income period (ISO date)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'End of income period (ISO date)',
    example: '2024-03-31',
  })
  @IsOptional()
  @IsString()
  periodEnd?: string;

  @ApiPropertyOptional({
    description: `Did the payer withhold tax from your payment?

If yes, they should provide you with Form 2307 (Certificate of Creditable Tax Withheld).
The withheld amount can be credited against your tax due.`,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasWithholding?: boolean;

  @ApiPropertyOptional({
    description: 'Amount of tax withheld by payer',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withheldAmount?: number;

  @ApiPropertyOptional({
    description: 'Withholding tax rate applied (as decimal, e.g., 0.05 for 5%)',
    example: 0.05,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  withholdingRate?: number;

  @ApiPropertyOptional({
    description: 'Have you received Form 2307 for this income?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  form2307Received?: boolean;

  @ApiPropertyOptional({
    description: 'Reference number on Form 2307',
    example: '2307-2024-001',
  })
  @IsOptional()
  @IsString()
  form2307Reference?: string;
}
