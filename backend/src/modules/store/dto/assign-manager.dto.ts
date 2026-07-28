import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignManagerDto {
  @ApiProperty({ description: 'User to assign as the store manager' })
  @IsUUID()
  managerId: string;
}
