import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RequestActionDto {
  @ApiPropertyOptional({ example: 'Approved — go ahead.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
