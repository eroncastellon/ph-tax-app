import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

const EXPENSE_CATEGORIES = [
  'RENT',
  'UTILITIES',
  'SUPPLIES',
  'PROFESSIONAL_FEES',
  'TRANSPORTATION',
  'COMMUNICATION',
  'DEPRECIATION',
  'SALARIES_WAGES',
  'TAXES_LICENSES',
  'INSURANCE',
  'INTEREST_EXPENSE',
  'REPAIRS_MAINTENANCE',
  'ADVERTISING',
  'BAD_DEBTS',
  'OTHER_DEDUCTIBLE',
];

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: 'Expense category',
    enum: EXPENSE_CATEGORIES,
  })
  @IsOptional()
  @IsEnum(EXPENSE_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({
    description: 'Description of the expense',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Expense amount',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Date the expense was incurred (ISO format)',
  })
  @IsOptional()
  @IsString()
  dateIncurred?: string;

  @ApiPropertyOptional({
    description: 'Whether you have an Official Receipt (OR)',
  })
  @IsOptional()
  @IsBoolean()
  hasReceipt?: boolean;

  @ApiPropertyOptional({
    description: 'Receipt/OR number',
  })
  @IsOptional()
  @IsString()
  receiptReference?: string;

  @ApiPropertyOptional({
    description: 'Name of vendor/supplier',
  })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({
    description: 'TIN of vendor',
  })
  @IsOptional()
  @IsString()
  vendorTin?: string;

  @ApiPropertyOptional({
    description: 'Whether this expense is tax-deductible',
  })
  @IsOptional()
  @IsBoolean()
  isDeductible?: boolean;

  @ApiPropertyOptional({
    description: 'Notes about deductibility',
  })
  @IsOptional()
  @IsString()
  deductibilityNote?: string;
}
