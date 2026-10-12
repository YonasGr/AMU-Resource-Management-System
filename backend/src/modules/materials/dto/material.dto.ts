import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { UnitCategory } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  materialCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsEnum(UnitCategory)
  @IsOptional()
  unitCategory?: UnitCategory;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z][a-z0-9_-]*$/)
  @IsOptional()
  baseUnit?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  conversionFactorToBase?: number;

  @IsBoolean()
  @IsOptional()
  allowsFractional?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minimumStock?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  categoryId!: string;
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  materialCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsEnum(UnitCategory)
  @IsOptional()
  unitCategory?: UnitCategory;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z][a-z0-9_-]*$/)
  @IsOptional()
  baseUnit?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  conversionFactorToBase?: number;

  @IsBoolean()
  @IsOptional()
  allowsFractional?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minimumStock?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}
