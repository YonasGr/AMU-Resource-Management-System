import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';

export class PurchaseRequestLineDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({ type: [PurchaseRequestLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestLineDto)
  lines: PurchaseRequestLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
