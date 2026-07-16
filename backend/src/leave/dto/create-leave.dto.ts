import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateLeaveDto {
  @ApiProperty({ example: '6a4389507ecf588bb38b2323' })
  @IsMongoId()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2026-07-11' })
  @IsDateString()
  toDate: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  totalDays?: number;

  @ApiProperty({ example: 'CASUAL', enum: ['CASUAL', 'SICK', 'EARNED', 'UNPAID'] })
  @IsIn(['CASUAL', 'SICK', 'EARNED', 'UNPAID'])
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiPropertyOptional({ enum: ['AM', 'PM'] })
  @ValidateIf((o) => o.isHalfDay === true)
  @IsIn(['AM', 'PM'])
  halfDaySession?: 'AM' | 'PM';
}
