import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WorkFromHomeDto {
  @ApiPropertyOptional({ description: 'Optional note for work-from-home day' })
  @IsOptional()
  @IsString()
  note?: string;
}
