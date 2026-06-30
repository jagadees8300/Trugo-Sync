import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] })
  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  project?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  assignedTo?: string;
}
