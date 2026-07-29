import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class DisposeStockDto {
  @ApiProperty({ description: 'Item being disposed' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store disposing from' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;
}
