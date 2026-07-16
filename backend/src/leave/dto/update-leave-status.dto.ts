import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateLeaveStatusDto {
  @ApiProperty({ enum: ['Pending', 'Approved', 'Rejected'], example: 'Approved' })
  @IsEnum(['Pending', 'Approved', 'Rejected'])
  @IsNotEmpty()
  status: 'Pending' | 'Approved' | 'Rejected';
}
