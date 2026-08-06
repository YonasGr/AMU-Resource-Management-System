import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDisposalRequestDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ example: 'Beyond economical repair' })
  @IsString()
  @MinLength(5)
  reason: string;

  @ApiProperty({ example: 'Certified e-waste recycler' })
  @IsString()
  @MinLength(3)
  method: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionNotes?: string;
}
