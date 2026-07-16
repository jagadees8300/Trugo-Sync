import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';

@ApiTags('tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create task and notify assignee' })
  @ApiResponse({ status: 201, description: 'Task created' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: { user: AuthUser }) {
    return this.tasksService.create(createTaskDto, req.user?.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get tasks (scoped by role)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'project', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Request() req: { user: AuthUser },
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('project') project?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll(
      {
        status,
        assignedTo,
        project: project || projectId,
        search,
      },
      req.user,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get tasks assigned to a user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'User task list' })
  findByUser(
    @Request() req: { user: AuthUser },
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findAll({ assignedTo: userId, status }, req.user);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'List subtasks for a parent task' })
  getSubtasks(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.tasksService.getSubtasks(id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by id' })
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.tasksService.findOne(id, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status and sync project progress' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tasksService.updateStatus(id, dto.status, req.user?.userId, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user?.userId, req.user);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tasksService.addComment(id, addCommentDto.text, req.user.userId, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Delete task' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
