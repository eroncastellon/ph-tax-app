import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  Matches,
  Min,
  Max,
} from 'class-validator';

export class CreateTaxProfileDto {
  @ApiProperty({
    description: 'Tax year',
    example: 2024,
    minimum: 2018,
  })
  @IsInt()
  @Min(2018)
  @Max(2030)
  taxYear: number;

  @ApiProperty({
    description: 'User type classification',
    enum: ['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS', 'MIXED_INCOME'],
    example: 'FREELANCER',
  })
  @IsEnum(['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS', 'MIXED_INCOME'])
  userType: string;

  @ApiPropertyOptional({
    description: 'BIR registration status',
    enum: ['NOT_REGISTERED', 'PENDING_REGISTRATION', 'REGISTERED', 'NEEDS_UPDATE'],
    default: 'NOT_REGISTERED',
  })
  @IsOptional()
  @IsEnum(['NOT_REGISTERED', 'PENDING_REGISTRATION', 'REGISTERED', 'NEEDS_UPDATE'])
  registrationStatus?: string;

  @ApiPropertyOptional({
    description: 'Tax Identification Number (format: XXX-XXX-XXX-XXX)',
    example: '123-456-789-000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-\d{3}-\d{3}-\d{3}$/, {
    message: 'TIN must be in format XXX-XXX-XXX-XXX',
  })
  tin?: string;

  @ApiPropertyOptional({
    description: 'Revenue District Office code',
    example: '050',
  })
  @IsOptional()
  @IsString()
  rdo?: string;

  @ApiPropertyOptional({
    description: 'Revenue District Office name',
    example: 'RDO 50 - South Quezon City',
  })
  @IsOptional()
  @IsString()
  rdoName?: string;

  @ApiPropertyOptional({
    description: 'Date registered with BIR (ISO format)',
    example: '2020-01-15',
  })
  @IsOptional()
  @IsString()
  dateRegistered?: string;

  @ApiPropertyOptional({
    description: 'Registered business name (for self-employed/business)',
    example: 'Juan Web Design Services',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: '123 Main St, Quezon City',
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Line of business / occupation',
    example: 'Web Design and Development Services',
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({
    description: 'Whether user has employment income (for mixed income)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasEmploymentIncome?: boolean;

  @ApiPropertyOptional({
    description: 'Employer name (if has employment income)',
    example: 'ABC Corporation',
  })
  @IsOptional()
  @IsString()
  employerName?: string;

  @ApiPropertyOptional({
    description: 'Employer TIN (if has employment income)',
    example: '000-000-000-000',
  })
  @IsOptional()
  @IsString()
  employerTin?: string;

  @ApiPropertyOptional({
    description: 'Selected tax regime',
    enum: ['GRADUATED_RATES', 'EIGHT_PERCENT_FLAT', 'UNDETERMINED'],
    default: 'UNDETERMINED',
  })
  @IsOptional()
  @IsEnum(['GRADUATED_RATES', 'EIGHT_PERCENT_FLAT', 'UNDETERMINED'])
  selectedRegime?: string;
}
