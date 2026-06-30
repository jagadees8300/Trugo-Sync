import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a-secure-token-123' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
