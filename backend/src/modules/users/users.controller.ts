import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Roles(Role.ADMINISTRATOR)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (Administrator only - UC2, UC3)' })
  create(@CurrentUser() currentUser: SafeUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, currentUser.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all users (Administrator only)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID (Administrator only)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details & role (Administrator only)' })
  update(
    @CurrentUser() currentUser: SafeUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto, currentUser.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (Administrator only)' })
  async remove(
    @CurrentUser() currentUser: SafeUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.delete(id, currentUser.id);
    return { success: true };
  }
}
