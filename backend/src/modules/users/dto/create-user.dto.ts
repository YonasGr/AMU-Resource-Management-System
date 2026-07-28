import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Ahmed Ali' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'ahmed.ali@amu.edu.et' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+251911000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Organization unit this user belongs to' })
  @IsUUID()
  organizationId: string;
}
