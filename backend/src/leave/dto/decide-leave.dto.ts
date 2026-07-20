import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideLeaveDto {
  @ApiPropertyOptional({
    description: 'Reason/message shown to the employee for this decision',
    example: 'Approved. Enjoy your break!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
