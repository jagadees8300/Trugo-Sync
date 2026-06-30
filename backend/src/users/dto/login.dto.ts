import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'The email of the user' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'The password of the user' })
  password: string;
}
