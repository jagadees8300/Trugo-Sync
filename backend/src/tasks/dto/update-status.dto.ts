import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    description:
      'Built-in status (TO_DO, IN_PROGRESS, DONE) or a custom project stage key (e.g. QC, TESTING)',
    example: 'QC',
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}
