import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Gopinath' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'gopi@trugosync.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Field Agent' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({
    example: 'EMPLOYEE',
    enum: ['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT'],
  })
  @IsOptional()
  @IsIn(['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'CLIENT'])
  role?: 'ADMIN' | 'HR' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'CLIENT';

  @ApiPropertyOptional({
    example: 'newpassword123',
    description: 'Optional new password (min 6 chars). Leave empty to keep current.',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
