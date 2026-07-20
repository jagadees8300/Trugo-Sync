import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class BulkDeleteNotificationsDto {
  @ApiProperty({ type: [String], example: ['507f1f77bcf86cd799439011'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  ids: string[];
}
