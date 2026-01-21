import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, Matches } from 'class-validator';

export class UpdateTaxProfileDto {
  @ApiPropertyOptional({
    description: 'User type classification',
    enum: ['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS', 'MIXED_INCOME'],
  })
  @IsOptional()
  @IsEnum(['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS', 'MIXED_INCOME'])
  userType?: string;

  @ApiPropertyOptional({
    description: 'BIR registration status',
    enum: ['NOT_REGISTERED', 'PENDING_REGISTRATION', 'REGISTERED', 'NEEDS_UPDATE'],
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
  })
  @IsOptional()
  @IsString()
  rdo?: string;

  @ApiPropertyOptional({
    description: 'Revenue District Office name',
  })
  @IsOptional()
  @IsString()
  rdoName?: string;

  @ApiPropertyOptional({
    description: 'Date registered with BIR (ISO format)',
  })
  @IsOptional()
  @IsString()
  dateRegistered?: string;

  @ApiPropertyOptional({
    description: 'Registered business name',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Business address',
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Line of business / occupation',
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({
    description: 'Whether user has employment income',
  })
  @IsOptional()
  @IsBoolean()
  hasEmploymentIncome?: boolean;

  @ApiPropertyOptional({
    description: 'Employer name',
  })
  @IsOptional()
  @IsString()
  employerName?: string;

  @ApiPropertyOptional({
    description: 'Employer TIN',
  })
  @IsOptional()
  @IsString()
  employerTin?: string;

  @ApiPropertyOptional({
    description: 'Selected tax regime. Note: Cannot be changed after first quarterly filing.',
    enum: ['GRADUATED_RATES', 'EIGHT_PERCENT_FLAT', 'UNDETERMINED'],
  })
  @IsOptional()
  @IsEnum(['GRADUATED_RATES', 'EIGHT_PERCENT_FLAT', 'UNDETERMINED'])
  selectedRegime?: string;
}
