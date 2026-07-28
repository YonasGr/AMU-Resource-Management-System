import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationUnitStatus, OrganizationUnitType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateOrganizationUnitDto {
  @ApiPropertyOptional({ example: 'College of Engineering' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: OrganizationUnitType })
  @IsOptional()
  @IsEnum(OrganizationUnitType)
  type?: OrganizationUnitType;

  @ApiPropertyOptional({ enum: OrganizationUnitStatus })
  @IsOptional()
  @IsEnum(OrganizationUnitStatus)
  status?: OrganizationUnitStatus;

  @ApiPropertyOptional({ description: 'Move this unit under a different parent' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
