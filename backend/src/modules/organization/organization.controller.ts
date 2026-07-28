import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationUnitDto } from './dto/create-organization-unit.dto';
import { UpdateOrganizationUnitDto } from './dto/update-organization-unit.dto';

@ApiTags('organization')
@Controller('organization-units')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization unit (college, department, office, ...)' })
  create(@Body() dto: CreateOrganizationUnitDto) {
    return this.organizationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organization units (flat), optionally filtered' })
  findAll(@Query('type') type?: string, @Query('status') status?: string) {
    return this.organizationService.findAll({ type, status });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get the full organization tree, nested from the root(s) down' })
  getTree() {
    return this.organizationService.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single organization unit by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get the direct children of an organization unit' })
  getChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.getChildren(id);
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get the ancestor chain of a unit, immediate parent first' })
  getAncestors(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.getAncestors(id);
  }

  @Get(':id/subtree')
  @ApiOperation({ summary: 'Get a unit and all of its descendants, nested' })
  getSubtree(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.getSubtree(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization unit (rename, re-type, or re-parent)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrganizationUnitDto) {
    return this.organizationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate an organization unit (soft delete)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.deactivate(id);
  }
}
