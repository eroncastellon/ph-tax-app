import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaxProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: string;

  @ApiProperty({ example: 2024 })
  taxYear: number;

  @ApiProperty({
    enum: ['FREELANCER', 'SELF_EMPLOYED', 'MICRO_SMALL_BUSINESS', 'MIXED_INCOME'],
    example: 'FREELANCER',
  })
  userType: string;

  @ApiProperty({
    enum: ['NOT_REGISTERED', 'PENDING_REGISTRATION', 'REGISTERED', 'NEEDS_UPDATE'],
    example: 'REGISTERED',
  })
  registrationStatus: string;

  @ApiPropertyOptional({ example: '123-456-789-000' })
  tin?: string | null;

  @ApiPropertyOptional({ example: '050' })
  rdo?: string | null;

  @ApiPropertyOptional({ example: 'RDO 50 - South Quezon City' })
  rdoName?: string | null;

  @ApiPropertyOptional({ example: '2020-01-15T00:00:00.000Z' })
  dateRegistered?: Date | null;

  @ApiPropertyOptional({ example: 'Juan Web Design Services' })
  businessName?: string | null;

  @ApiPropertyOptional({ example: '123 Main St, Quezon City' })
  businessAddress?: string | null;

  @ApiPropertyOptional({ example: 'Web Design and Development Services' })
  businessType?: string | null;

  @ApiProperty({ example: false })
  hasEmploymentIncome: boolean;

  @ApiPropertyOptional({ example: 'ABC Corporation' })
  employerName?: string | null;

  @ApiPropertyOptional({ example: '000-000-000-000' })
  employerTin?: string | null;

  @ApiProperty({
    enum: ['GRADUATED_RATES', 'EIGHT_PERCENT_FLAT', 'UNDETERMINED'],
    example: 'EIGHT_PERCENT_FLAT',
  })
  selectedRegime: string;

  @ApiPropertyOptional({
    description: 'Date when regime was locked (after first filing)',
    example: '2024-05-15T00:00:00.000Z',
  })
  regimeLockedAt?: Date | null;

  @ApiProperty({ example: true })
  isComplete: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
