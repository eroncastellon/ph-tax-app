import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class UpdateIncomeDto {
  @ApiPropertyOptional({
    description: 'Type of income',
    enum: ['FREELANCE_SERVICE', 'BUSINESS_SALES', 'EMPLOYMENT', 'RENTAL', 'ROYALTIES', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['FREELANCE_SERVICE', 'BUSINESS_SALES', 'EMPLOYMENT', 'RENTAL', 'ROYALTIES', 'OTHER'])
  incomeType?: string;

  @ApiPropertyOptional({
    description: 'Gross amount received',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  grossAmount?: number;

  @ApiPropertyOptional({
    description: 'Description of the income source',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Name of client/payer',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Income frequency',
    enum: ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'IRREGULAR'],
  })
  @IsOptional()
  @IsEnum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'IRREGULAR'])
  frequency?: string;

  @ApiPropertyOptional({
    description: 'Start of income period (ISO date)',
  })
  @IsOptional()
  @IsString()
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'End of income period (ISO date)',
  })
  @IsOptional()
  @IsString()
  periodEnd?: string;

  @ApiPropertyOptional({
    description: 'Whether tax was withheld',
  })
  @IsOptional()
  @IsBoolean()
  hasWithholding?: boolean;

  @ApiPropertyOptional({
    description: 'Amount of tax withheld',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withheldAmount?: number;

  @ApiPropertyOptional({
    description: 'Withholding tax rate (as decimal)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  withholdingRate?: number;

  @ApiPropertyOptional({
    description: 'Whether Form 2307 has been received',
  })
  @IsOptional()
  @IsBoolean()
  form2307Received?: boolean;

  @ApiPropertyOptional({
    description: 'Reference number on Form 2307',
  })
  @IsOptional()
  @IsString()
  form2307Reference?: string;
}
