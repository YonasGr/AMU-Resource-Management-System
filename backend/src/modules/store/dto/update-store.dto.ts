import { ApiPropertyOptional } from '@nestjs/swagger';
import { StoreStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStoreDto {
  @ApiPropertyOptional({ example: 'ICT Store' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'ICT Directorate Building, Ground Floor' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: StoreStatus })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;
}
