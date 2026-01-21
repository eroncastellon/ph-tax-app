import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsString, IsNumber, IsBoolean } from 'class-validator';

class ExplainRuleContextDto {
  @ApiPropertyOptional({
    description: 'User type for contextual explanation',
    example: 'FREELANCER',
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({
    description: 'Gross income for contextual notes',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  grossIncome?: number;

  @ApiPropertyOptional({
    description: 'Total expenses for contextual notes',
    example: 150000,
  })
  @IsOptional()
  @IsNumber()
  expenses?: number;

  @ApiPropertyOptional({
    description: 'Whether user has employment income',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasEmploymentIncome?: boolean;

  @ApiPropertyOptional({
    description: 'Currently selected regime',
    example: 'UNDETERMINED',
  })
  @IsOptional()
  @IsString()
  selectedRegime?: string;
}

export class ExplainRuleDto {
  @ApiPropertyOptional({
    description: 'User context for more relevant explanation',
    type: ExplainRuleContextDto,
  })
  @IsOptional()
  @IsObject()
  context?: ExplainRuleContextDto;
}
