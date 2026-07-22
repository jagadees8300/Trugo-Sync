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
import { TaskTimeService } from './task-time.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { BulkCreateTasksDto } from './dto/bulk-create-tasks.dto';
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
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskTimeService: TaskTimeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create task and notify assignee' })
  @ApiResponse({ status: 201, description: 'Task created' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: { user: AuthUser }) {
    return this.tasksService.create(createTaskDto, req.user?.userId, req.user);
  }

  @Post('bulk')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({
    summary: 'Bulk create tasks (Excel grid assign from Team Status)',
  })
  @ApiResponse({ status: 201, description: 'Tasks created' })
  createBulk(
    @Body() dto: BulkCreateTasksDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tasksService.createBulk(dto.tasks, req.user?.userId, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get tasks (scoped by role)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'project', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'priority', required: false, enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @ApiQuery({ name: 'overdue', required: false, description: 'true to show overdue tasks only' })
  @ApiQuery({ name: 'deadlineFrom', required: false })
  @ApiQuery({ name: 'deadlineTo', required: false })
  @ApiQuery({ name: 'createdFrom', required: false })
  @ApiQuery({ name: 'createdTo', required: false })
  findAll(
    @Request() req: { user: AuthUser },
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('project') project?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
    @Query('priority') priority?: string,
    @Query('overdue') overdue?: string,
    @Query('deadlineFrom') deadlineFrom?: string,
    @Query('deadlineTo') deadlineTo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.tasksService.findAll(
      {
        status,
        assignedTo,
        project: project || projectId,
        search,
        priority,
        overdue: overdue === 'true' || overdue === '1',
        deadlineFrom,
        deadlineTo,
        createdFrom,
        createdTo,
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

  @Get(':id/time')
  @ApiOperation({
    summary:
      'Task time summary: total hours, daily breakdown, per-user (pause time excluded)',
  })
  getTime(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.taskTimeService.getSummary(id, req.user);
  }

  @Post(':id/time/start')
  @ApiOperation({ summary: 'Start or resume task timer (pause time not counted)' })
  startTime(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.taskTimeService.start(id, req.user);
  }

  @Post(':id/time/pause')
  @ApiOperation({ summary: 'Pause task timer (break / lunch — not counted)' })
  pauseTime(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.taskTimeService.pause(id, req.user);
  }

  @Post(':id/time/stop')
  @ApiOperation({ summary: 'Stop task timer for today; can start again later / next day' })
  stopTime(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.taskTimeService.stop(id, req.user);
  }

  @Post(':id/move-with-timer')
  @ApiOperation({
    summary:
      'Move task status and auto-sync timer (To Do→In Progress = start, Done→In Progress = resume old time, →Done = stop). Used by Kanban drag and Start/Complete/Reopen.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status moved; timerSync is started | resumed | stopped | null',
  })
  moveWithTimer(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tasksService.moveWithTimer(
      id,
      dto.status,
      req.user?.userId,
      req.user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by id' })
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.tasksService.findOne(id, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Update task status — auto-starts timer on In Progress, auto-stops on Done/To Do',
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tasksService.updateStatus(id, dto.status, req.user?.userId, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update task fields (admin only)' })
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
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete task (admin only)' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
