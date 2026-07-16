import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {

  ArrayMinSize,

  IsArray,

  IsDateString,

  IsIn,

  IsMongoId,

  IsNotEmpty,

  IsOptional,

  IsString,

} from 'class-validator';



export class CreateMilestoneDto {

  @ApiPropertyOptional()

  @IsString()

  @IsNotEmpty()

  title: string;



  @ApiPropertyOptional()

  @IsOptional()

  @IsDateString()

  dueDate?: string;



  @ApiPropertyOptional({ enum: ['PENDING', 'IN_PROGRESS', 'DONE'] })

  @IsOptional()

  @IsIn(['PENDING', 'IN_PROGRESS', 'DONE'])

  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE';



  @ApiProperty({

    type: [String],

    description: 'Required: manually mentioned team member user ids',

  })

  @IsArray()

  @ArrayMinSize(1, { message: 'Mention at least one employee' })

  @IsMongoId({ each: true })

  assigneeIds: string[];

}


