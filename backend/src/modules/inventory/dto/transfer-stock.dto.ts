import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class TransferStockDto {
  @ApiProperty({ description: 'Item being transferred' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store the stock is leaving' })
  @IsUUID()
  fromStoreId: string;

  @ApiProperty({ description: 'Store the stock is arriving at' })
  @IsUUID()
  toStoreId: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Links both movement rows to a Transfer Request once that exists' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
