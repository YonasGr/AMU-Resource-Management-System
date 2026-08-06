import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetCondition } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class BorrowActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InspectReturnDto {
  @ApiProperty({ enum: AssetCondition })
  @IsEnum(AssetCondition)
  condition: AssetCondition;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  notes: string;
}
