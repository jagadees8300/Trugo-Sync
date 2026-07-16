import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('leave')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Leave summary report' })
  leaveReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    return this.reportsService.leaveSummary(from, to, format, res);
  }

  @Get('utilization')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Task utilization report' })
  utilization(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    return this.reportsService.utilization(from, to, format, res);
  }

  @Get('attendance')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Attendance + leave hours report' })
  attendance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    return this.reportsService.attendance(from, to, format, res);
  }

  @Get('projects')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Project health report' })
  projects(
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    return this.reportsService.projectHealth(format, res);
  }
}
