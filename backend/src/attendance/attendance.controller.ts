import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';
import { ClockInDto } from './dto/clock-in.dto';
import { CheckLocationDto } from './dto/check-location.dto';
import { WorkFromHomeDto } from './dto/work-from-home.dto';
import { PauseAttendanceDto } from './dto/pause-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('office-config')
  @ApiOperation({ summary: 'Office GPS geofence settings (for clock-in)' })
  getOfficeConfig() {
    return this.attendanceService.getOfficeConfig();
  }

  @Post('check-location')
  @ApiOperation({ summary: 'Check if GPS is within office radius (no clock-in)' })
  checkLocation(@Body() dto: CheckLocationDto) {
    return this.attendanceService.checkLocation(dto.latitude, dto.longitude);
  }

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in for today (GPS must be within office radius)' })
  clockIn(@Request() req: { user: AuthUser }, @Body() dto: ClockInDto) {
    return this.attendanceService.clockIn(
      req.user.userId,
      dto.latitude,
      dto.longitude,
      dto.note,
    );
  }

  @Post('work-from-home')
  @ApiOperation({ summary: 'Clock in for today as work from home (no GPS)' })
  clockInWorkFromHome(
    @Request() req: { user: AuthUser },
    @Body() dto: WorkFromHomeDto,
  ) {
    return this.attendanceService.clockInWorkFromHome(req.user.userId, dto.note);
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause attendance for today (optional reason)' })
  pause(@Request() req: { user: AuthUser }, @Body() dto: PauseAttendanceDto) {
    return this.attendanceService.pause(req.user.userId, dto.reason);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume attendance after pause' })
  resume(@Request() req: { user: AuthUser }) {
    return this.attendanceService.resume(req.user.userId);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out for today' })
  clockOut(@Request() req: { user: AuthUser }) {
    return this.attendanceService.clockOut(req.user.userId);
  }

  @Get('me/today')
  @ApiOperation({ summary: 'Get my attendance for today' })
  getToday(@Request() req: { user: AuthUser }) {
    return this.attendanceService.getToday(req.user.userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my attendance history' })
  getMine(
    @Request() req: { user: AuthUser },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getMine(req.user.userId, from, to);
  }

  @Get('date')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Daily attendance with clock + leave (HR)' })
  getByDate(@Query('date') date: string) {
    return this.attendanceService.getByDate(date);
  }
}
