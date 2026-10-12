import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsNumber,
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
