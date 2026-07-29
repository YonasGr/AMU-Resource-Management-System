import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemAssetType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 'Laptop Dell Latitude' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'piece' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  serialRequired?: boolean;

  @ApiPropertyOptional({ enum: ItemAssetType, default: ItemAssetType.CONSUMABLE })
  @IsOptional()
  @IsEnum(ItemAssetType)
  assetType?: ItemAssetType;

  @ApiProperty({ description: 'Item category id' })
  @IsUUID()
  categoryId: string;
}
