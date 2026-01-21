import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  taxProfileId: string;

  @ApiProperty({
    example: 'SUPPLIES',
  })
  category: string;

  @ApiProperty({ example: 'Office supplies from National Bookstore' })
  description: string;

  @ApiProperty({ example: '2500.00' })
  amount: string;

  @ApiProperty({ example: '2024-02-15T00:00:00.000Z' })
  dateIncurred: Date;

  @ApiProperty({ example: true })
  hasReceipt: boolean;

  @ApiPropertyOptional({ example: 'OR-12345' })
  receiptReference?: string | null;

  @ApiPropertyOptional({ example: 'National Bookstore' })
  vendorName?: string | null;

  @ApiPropertyOptional({ example: '000-000-000-000' })
  vendorTin?: string | null;

  @ApiProperty({ example: true })
  isDeductible: boolean;

  @ApiPropertyOptional({ example: 'Business use only' })
  deductibilityNote?: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
