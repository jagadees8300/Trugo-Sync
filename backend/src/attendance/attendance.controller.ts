import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ClockInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in for today' })
  clockIn(@Request() req: { user: AuthUser }, @Body() dto: ClockInDto) {
    return this.attendanceService.clockIn(req.user.userId, dto.note);
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
