import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateExpenseDto {
  @ApiProperty({
    description: `Expense category. Common categories include:

- RENT: Office/business space rent
- UTILITIES: Electricity, water, internet
- SUPPLIES: Office supplies, materials
- PROFESSIONAL_FEES: Fees paid to accountants, lawyers
- TRANSPORTATION: Business travel, fuel
- COMMUNICATION: Phone, internet for business
- SALARIES_WAGES: Employee salaries
- ADVERTISING: Marketing expenses
- OTHER_DEDUCTIBLE: Other business expenses`,
    enum: EXPENSE_CATEGORIES,
    example: 'SUPPLIES',
  })
  @IsEnum(EXPENSE_CATEGORIES)
  category: string;

  @ApiProperty({
    description: 'Description of the expense',
    example: 'Office supplies from National Bookstore',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Expense amount',
    example: 2500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Date the expense was incurred (ISO format)',
    example: '2024-02-15',
  })
  @IsString()
  dateIncurred: string;

  @ApiPropertyOptional({
    description: 'Whether you have an Official Receipt (OR) for this expense',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasReceipt?: boolean;

  @ApiPropertyOptional({
    description: 'Receipt/OR number',
    example: 'OR-12345',
  })
  @IsOptional()
  @IsString()
  receiptReference?: string;

  @ApiPropertyOptional({
    description: 'Name of vendor/supplier',
    example: 'National Bookstore',
  })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({
    description: 'TIN of vendor (for verification)',
    example: '000-000-000-000',
  })
  @IsOptional()
  @IsString()
  vendorTin?: string;

  @ApiPropertyOptional({
    description: 'Whether this expense is tax-deductible',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isDeductible?: boolean;

  @ApiPropertyOptional({
    description: 'Notes about deductibility',
    example: 'Business use only',
  })
  @IsOptional()
  @IsString()
  deductibilityNote?: string;
}
