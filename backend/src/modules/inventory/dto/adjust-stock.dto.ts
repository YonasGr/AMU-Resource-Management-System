import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ description: 'Item being adjusted' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store whose stock is being adjusted' })
  @IsUUID()
  storeId: string;

  @ApiProperty({
    example: -3,
    description: 'Signed delta — positive to increase, negative to decrease. Cannot be 0.',
  })
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Reason/reference for this correction' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
