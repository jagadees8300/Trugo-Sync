import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsMongoId,
  IsArray,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    required: false,
    enum: ['TO_DO', 'IN_PROGRESS', 'DONE', 'PENDING', 'COMPLETED'],
  })
  @IsEnum(['TO_DO', 'IN_PROGRESS', 'DONE', 'PENDING', 'COMPLETED'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  @IsOptional()
  priority?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ required: false, description: 'Project MongoDB id' })
  @IsMongoId()
  @IsOptional()
  project?: string;

  @ApiProperty({ required: false, description: 'Alias for project' })
  @IsMongoId()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  parentTaskId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  dependsOn?: string[];

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  milestoneId?: string;
}
