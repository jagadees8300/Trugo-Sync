import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create employee user (admin only)' })
  @ApiResponse({ status: 201, description: 'Employee created successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('assignees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get users for assignee dropdowns' })
  async findAssignees() {
    return this.usersService.findAssignees();
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List client users for project assignment' })
  async findClients() {
    return this.usersService.findClients();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  async findAll() {
    return this.usersService.findAll();
  }
}
