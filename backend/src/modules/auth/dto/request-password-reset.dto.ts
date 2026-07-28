import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'admin@amu.edu.et' })
  @IsEmail()
  email: string;
}
