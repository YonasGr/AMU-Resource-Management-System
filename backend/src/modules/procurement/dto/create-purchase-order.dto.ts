import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, ValidateNested } from 'class-validator';

export class PurchaseOrderLineDto {
  @ApiProperty() @IsUUID() itemId: string;
  @ApiProperty({ example: 100 }) @IsInt() @IsPositive() quantity: number;
  @ApiProperty({ example: 45000 }) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString() poNumber: string;
  @ApiProperty() @IsUUID() supplierId: string;
  @ApiProperty() @IsUUID() requestId: string;
  @ApiProperty() @IsUUID() destinationStoreId: string;
  @ApiPropertyOptional({ default: 'ETB' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];
}
