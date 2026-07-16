import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ example: 'Independence Day' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}
