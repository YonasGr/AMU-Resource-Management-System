import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetMinimumStockDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  minimumStock: number;
}
