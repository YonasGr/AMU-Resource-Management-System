import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateItemRequestDto {
  @ApiProperty({ description: 'Item being requested' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store the item should be issued from' })
  @IsUUID()
  targetStoreId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ example: 'Needed for the new lab setup' })
  @IsOptional()
  @IsString()
  notes?: string;
}
