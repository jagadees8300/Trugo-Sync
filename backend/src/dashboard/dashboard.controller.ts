import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('my-stats')
  @ApiOperation({ summary: 'Get my task statistics (employee)' })
  getMyStats(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getMyStats(req.user.userId);
  }

  @Get('stats')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Get overall task statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('team-status')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Get per-user task breakdown' })
  getTeamStatus() {
    return this.dashboardService.getTeamStatus();
  }

  @Get('project-progress')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Get per-project task progress' })
  getProjectProgress() {
    return this.dashboardService.getProjectProgress();
  }

  @Get('projects/:projectId')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Get project detail with assignee breakdown' })
  getProjectDetail(@Param('projectId') projectId: string) {
    return this.dashboardService.getProjectDetail(projectId);
  }

  @Get('deadlines')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Get upcoming project deadlines' })
  getDeadlines() {
    return this.dashboardService.getUpcomingDeadlines();
  }
}
