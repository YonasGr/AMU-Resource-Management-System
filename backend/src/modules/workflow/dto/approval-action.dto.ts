import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovalActionDto {
  @ApiPropertyOptional({ example: 'Looks good, approved.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
