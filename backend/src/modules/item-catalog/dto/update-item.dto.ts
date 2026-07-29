import { ApiPropertyOptional } from '@nestjs/swagger';
import { ItemAssetType, ItemStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateItemDto {
  @ApiPropertyOptional({ example: 'Laptop Dell Latitude' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'piece' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  serialRequired?: boolean;

  @ApiPropertyOptional({ enum: ItemAssetType })
  @IsOptional()
  @IsEnum(ItemAssetType)
  assetType?: ItemAssetType;

  @ApiPropertyOptional({ enum: ItemStatus })
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @ApiPropertyOptional({ description: 'Move this item to a different category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
