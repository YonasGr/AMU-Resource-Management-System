import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRequestItemDto {
  @IsUUID()
  materialId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityRequested!: number;
}

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsUUID()
  departmentId!: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items!: CreateRequestItemDto[];
}

export class ApproveRejectRequestDto {
  @IsString()
  @IsNotEmpty()
  action!: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class IssueRequestDto {
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueRequestItemDto)
  @IsOptional()
  items?: IssueRequestItemDto[];
}

export class IssueRequestItemDto {
  @IsUUID()
  requestItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CancelRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class HandoverRequestDto {
  @IsString()
  @IsNotEmpty()
  evidence!: string;
}
