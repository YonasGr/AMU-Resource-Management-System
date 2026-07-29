import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class IssueStockDto {
  @ApiProperty({ description: 'Item being issued out' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store issuing the stock' })
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
