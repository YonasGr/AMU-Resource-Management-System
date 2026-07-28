import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationUnitType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateOrganizationUnitDto {
  @ApiProperty({ example: 'College of Engineering' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: OrganizationUnitType, example: OrganizationUnitType.COLLEGE })
  @IsEnum(OrganizationUnitType)
  type: OrganizationUnitType;

  @ApiPropertyOptional({
    description: 'Parent organization unit id. Omit for the root (University) node.',
    example: 'b3f1c2a4-...-uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
