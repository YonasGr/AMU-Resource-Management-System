import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class CreateWorkflowInstanceDto {
  @ApiProperty({ example: 'TRANSFER_REQUEST', description: 'WorkflowTemplate.code' })
  @IsString()
  templateCode: string;

  @ApiProperty({ example: 'TRANSFER_REQUEST', description: 'Free-text type of the entity this workflow is attached to' })
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'The id of the entity this workflow is attached to' })
  @IsString()
  entityId: string;

  @ApiProperty({
    description:
      'Data the workflow steps resolve approvers from, e.g. {"requesterOrganizationId": "...", "sourceStoreId": "...", "destinationStoreId": "..."}',
    example: { requesterOrganizationId: 'uuid', sourceStoreId: 'uuid', destinationStoreId: 'uuid' },
  })
  @IsObject()
  contextData: Record<string, string>;
}
