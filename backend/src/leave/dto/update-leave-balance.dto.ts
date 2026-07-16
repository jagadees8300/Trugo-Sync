import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, Min } from 'class-validator';

export class UpdateLeaveBalanceDto {
  @ApiProperty({ enum: ['CASUAL', 'SICK', 'EARNED', 'UNPAID'] })
  @IsIn(['CASUAL', 'SICK', 'EARNED', 'UNPAID'])
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  allocated: number;
}
