import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address',
    example: 'juan.delacruz@email.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePass123',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
