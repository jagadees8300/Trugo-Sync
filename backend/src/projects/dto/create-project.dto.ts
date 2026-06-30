import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  teamMembers?: string[];

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;
}
