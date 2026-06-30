import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'The name of the user' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'The email of the user' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'The password of the user' })
  password: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'The ID of the role', required: false })
  role?: string;
}
