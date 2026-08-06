import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  assetTag: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ description: 'The accepted goods-receipt line this unit came from' })
  @IsOptional()
  @IsUUID()
  goodsReceiptLineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedOrganizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.GOOD })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
