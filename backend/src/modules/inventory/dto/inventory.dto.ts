import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class StockInDto {
  @IsUUID()
  materialId!: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  purpose?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateGoodsReceiptDto {
  @IsUUID()
  materialId!: string;

  @IsUUID()
  storeId!: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityReceived!: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  deliveryReference?: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class InspectGoodsReceiptDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityAccepted!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityRejected!: number;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class StockOutDto {
  @IsUUID()
  materialId!: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  purpose?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ReturnDto {
  @IsUUID()
  requestId!: string;

  @IsUUID()
  requestItemId!: string;

  @IsUUID()
  materialId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class AdjustmentDto {
  @IsUUID()
  materialId!: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  newQuantity!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class CreateCycleCountLineDto {
  @IsUUID()
  materialId!: string;
}

export class CreateCycleCountDto {
  @IsUUID()
  storeId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCycleCountLineDto)
  lines!: CreateCycleCountLineDto[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SubmitCycleCountLineDto {
  @IsUUID()
  lineId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  physicalQuantity!: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  varianceReason?: string;
}

export class SubmitCycleCountDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitCycleCountLineDto)
  lines!: SubmitCycleCountLineDto[];
}

export class TransferDto {
  @IsUUID()
  materialId!: string;

  @IsUUID()
  sourceStoreId!: string;

  @IsUUID()
  destinationStoreId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsUUID()
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  purpose?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
