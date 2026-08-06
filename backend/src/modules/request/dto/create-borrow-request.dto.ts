import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateBorrowRequestDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ example: 'Teaching a mobile programming laboratory' })
  @IsString()
  @MinLength(3)
  purpose: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  expectedReturnDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
