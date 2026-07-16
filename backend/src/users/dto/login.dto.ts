import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@trugosync.com', description: 'The email of the user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password', description: 'The password of the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}
