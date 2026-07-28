import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateStoreDto {
  @ApiProperty({ example: 'ICT Store' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ICT-STORE-01', description: 'Unique store code' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiPropertyOptional({ example: 'ICT Directorate Building, Ground Floor' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Organization unit this store belongs to' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'User to assign as the store manager' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
