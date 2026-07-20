import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Gopinath', description: 'The name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'gopi@trugosync.com', description: 'Login email for the user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Initial password assigned by admin' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Field Agent', required: false })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiProperty({
    example: 'EMPLOYEE',
    required: false,
    enum: ['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT'],
  })
  @IsOptional()
  @IsIn(['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT'])
  role?: 'ADMIN' | 'HR' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'CLIENT';
}
