import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class GoodsReceiptLineDto {
  @ApiProperty() @IsUUID() purchaseOrderLineId: string;
  @ApiProperty({ example: 50 }) @IsInt() @Min(0) acceptedQuantity: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) damagedQuantity?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) rejectedQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty() @IsString() receiptNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [GoodsReceiptLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => GoodsReceiptLineDto)
  lines: GoodsReceiptLineDto[];
}
