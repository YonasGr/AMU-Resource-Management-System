import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class ReceiveStockDto {
  @ApiProperty({ description: 'Item being received' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store receiving the stock' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Links this movement to a Purchase/Request once those exist' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
