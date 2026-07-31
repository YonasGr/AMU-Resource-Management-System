import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateTransferRequestDto {
  @ApiProperty({ description: 'Item being transferred' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Store the item is currently in' })
  @IsUUID()
  sourceStoreId: string;

  @ApiProperty({ description: 'Store the item should move to' })
  @IsUUID()
  destinationStoreId: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ example: 'CS department needs these for the new lab' })
  @IsOptional()
  @IsString()
  notes?: string;
}
