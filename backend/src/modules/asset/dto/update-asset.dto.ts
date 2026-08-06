import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedOrganizationId?: string;

  @ApiPropertyOptional({ enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
