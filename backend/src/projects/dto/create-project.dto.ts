import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const PROJECT_CATEGORIES = ['Frontend', 'Backend', 'UI', 'QA'] as const;

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: [String],
    enum: PROJECT_CATEGORIES,
    description: 'Required: click/mention one or more categories',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one project category' })
  @IsIn(PROJECT_CATEGORIES, { each: true })
  categories: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  teamMembers?: string[];

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  deadline?: string;
}
