import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'juan.delacruz@email.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Juan' })
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Dela Cruz' })
  lastName?: string | null;

  @ApiProperty({ example: false })
  isEmailVerified: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}
