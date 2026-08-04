import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';

export class DistributionAllocationDto {
  @ApiProperty() @IsUUID() itemId: string;
  @ApiProperty() @IsUUID() destinationStoreId: string;
  @ApiProperty({ example: 50 }) @IsInt() @IsPositive() quantity: number;
}

export class CreateDistributionPlanDto {
  @ApiProperty() @IsString() planNumber: string;
  @ApiProperty() @IsUUID() sourceStoreId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [DistributionAllocationDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DistributionAllocationDto)
  allocations: DistributionAllocationDto[];
}
