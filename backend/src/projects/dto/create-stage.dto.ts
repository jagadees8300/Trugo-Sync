import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStageDto {
  @ApiProperty({ example: 'QC', description: 'Display name for the new stage' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({ example: '#8b5cf6' })
  @IsOptional()
  @IsString()
  color?: string;
}
