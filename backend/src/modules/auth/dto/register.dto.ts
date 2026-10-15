import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
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

  @ApiPropertyOptional({ example: 'Main Campus' })
  @IsOptional()
  @IsString()
  campusName?: string;

  @ApiPropertyOptional({ example: 'Information Technology' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ example: 'ICT Directorate' })
  @IsOptional()
  @IsString()
  directorate?: string;

  @ApiPropertyOptional({ example: 'Lecturer' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Department the requester belongs to' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
