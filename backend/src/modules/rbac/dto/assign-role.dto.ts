import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScopeType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'User to assign the role to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Role to assign' })
  @IsUUID()
  roleId: string;

  @ApiProperty({ enum: ScopeType, example: ScopeType.ORGANIZATION })
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @ApiPropertyOptional({
    description:
      'Organization unit id (if scopeType=ORGANIZATION) or store id (if scopeType=STORE). Omit for GLOBAL.',
  })
  @IsOptional()
  @IsUUID()
  scopeId?: string;
}
