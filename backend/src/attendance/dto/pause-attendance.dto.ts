import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PauseAttendanceDto {
  @ApiPropertyOptional({ description: 'Optional reason for pause (lunch, break, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
