import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IncomeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  taxProfileId: string;

  @ApiProperty({
    enum: ['FREELANCE_SERVICE', 'BUSINESS_SALES', 'EMPLOYMENT', 'RENTAL', 'ROYALTIES', 'OTHER'],
    example: 'FREELANCE_SERVICE',
  })
  incomeType: string;

  @ApiPropertyOptional({ example: 'Web development project' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'XYZ Company Inc.' })
  clientName?: string | null;

  @ApiProperty({ example: '50000.00' })
  grossAmount: string;

  @ApiProperty({
    enum: ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'IRREGULAR'],
    example: 'ONE_TIME',
  })
  frequency: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  periodStart?: Date | null;

  @ApiPropertyOptional({ example: '2024-03-31T00:00:00.000Z' })
  periodEnd?: Date | null;

  @ApiProperty({ example: true })
  hasWithholding: boolean;

  @ApiPropertyOptional({ example: '5000.00' })
  withheldAmount?: string | null;

  @ApiPropertyOptional({ example: '0.0500' })
  withholdingRate?: string | null;

  @ApiProperty({ example: true })
  form2307Received: boolean;

  @ApiPropertyOptional({ example: '2307-2024-001' })
  form2307Reference?: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
