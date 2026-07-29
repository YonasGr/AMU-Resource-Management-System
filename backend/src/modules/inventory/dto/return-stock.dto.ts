import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class ReturnStockDto {
  @ApiProperty({ description: 'Item being returned' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store receiving the returned stock' })
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
