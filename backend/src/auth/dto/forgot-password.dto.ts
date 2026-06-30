import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@trugosync.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
