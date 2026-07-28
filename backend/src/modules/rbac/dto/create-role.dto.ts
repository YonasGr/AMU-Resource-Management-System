import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'LAB_COORDINATOR', description: 'Unique upper_snake_case code' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ example: 'Lab Coordinator' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
